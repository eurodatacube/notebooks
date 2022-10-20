"""
Module for LSTM models
"""
import os

import torch
import torch.nn.functional as F
from torch import nn


# This code is taken from https://github.com/TUM-LMF/BreizhCrops
class LSTM(nn.Module):
    """
    Implementation of the LSTM model for classification of a input sequence into n classes.

    :param input_dim: number of input features entering LSTM cell (i.e. 13 if all S2 bands are used)
    :type input_dim: int
    :param n_classes: number of classes
    :type n_classes: int (class labels have to be between 0 and n_classes-1)
    :param hidden_dims: The number of features in the hidden state `h`
    :type hidden_dims: int
    :param num_rnn_layers: Number of recurrent layers. E.g., setting ``num_layers=2``
                           would mean stacking two LSTMs together to form a `stacked LSTM`,
                           with the second LSTM taking in outputs of the first LSTM and
                           computing the final results.
    :type num_rnn_layers: int
    :param dropout: If non-zero, introduces a `Dropout` layer on the outputs of each
                    LSTM layer except the last layer, with dropout probability equal to
                    :attr:`dropout`.
    :type dropout: float (between 0.0 and 1.0)
    :param bidirectional: If ``True``, becomes a bidirectional LSTM.
    :type bidirectional: bool
    :param use_batchnorm: If ``True``, use batch normalization.
    :type use_batchnorm: bool
    :param use_layernorm: If ``True``, applies Layer Normalization over a mini-batch of inputs.
    :type use_layernorm: bool
    """

    def __init__(
        self,
        input_dim,
        n_classes,
        hidden_dims,
        num_rnn_layers=1,
        dropout=0,
        bidirectional=False,
        use_batchnorm=False,
        use_layernorm=True,
    ):
        super().__init__()

        self.nclasses = n_classes
        self.use_batchnorm = use_batchnorm
        self.use_layernorm = use_layernorm

        self.d_model = num_rnn_layers * hidden_dims
        if use_layernorm:
            self.inlayernorm = nn.LayerNorm(input_dim)
            self.clayernorm = nn.LayerNorm((hidden_dims + hidden_dims * bidirectional) * num_rnn_layers)

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dims,
            num_layers=num_rnn_layers,
            bias=False,
            batch_first=True,
            dropout=dropout,
            bidirectional=bidirectional,
        )

        if bidirectional:
            hidden_dims = hidden_dims * 2

        self.linear_class = nn.Linear(hidden_dims * num_rnn_layers, n_classes, bias=True)

        if use_batchnorm:
            self.bn = nn.BatchNorm1d(hidden_dims)

    def _logits(self, x):
        x = x.transpose(1, 2)

        if self.use_layernorm:
            x = self.inlayernorm(x)

        outputs, last_state_list = self.lstm.forward(x)

        # TODO: check what is goinig on here
        if self.use_batchnorm:
            b, t, d = outputs.shape
            o_ = outputs.view(b, -1, d).permute(0, 2, 1)
            outputs = self.bn(o_).permute(0, 2, 1).view(b, t, d)

        h, c = last_state_list

        nlayers, batchsize, n_hidden = c.shape
        # TODO: shouldn't this be executed only uf layernorm is True
        h = self.clayernorm(c.transpose(0, 1).contiguous().view(batchsize, nlayers * n_hidden))
        logits = self.linear_class.forward(h)

        return logits

    def forward(self, x):
        logits = self._logits(x)

        logprobabilities = F.log_softmax(logits, dim=-1)
        return logprobabilities

    def save(self, path="model.pth", **kwargs):
        model_state = self.state_dict()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        torch.save(dict(model_state=model_state, **kwargs), path)

    def load(self, path):
        snapshot = torch.load(path, map_location="cpu")
        model_state = snapshot.pop("model_state", snapshot)
        self.load_state_dict(model_state)
        return snapshot

    def update_and_freeze_body(self, pretrained, freeze_layers=(0, -1)):
        self.inlayernorm = pretrained.inlayernorm
        self.clayernorm = pretrained.clayernorm
        self.lstm = pretrained.lstm

        for child in list(self.children())[freeze_layers[0] : freeze_layers[1]]:
            for param in child.parameters():
                param.requires_grad = False

    def unfreeze(self):
        for child in self.children():
            for param in child.parameters():
                param.requires_grad = True
