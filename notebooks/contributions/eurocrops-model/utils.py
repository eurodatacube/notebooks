import numpy as np
import torch
from sklearn.metrics import accuracy_score


class AverageMetric:
    """
    Simple class for averaging metrics.
    """

    def __init__(self):
        self.values = []

    def add(self, new):
        self.values.append(new)

    def get(self):
        return np.array(self.values).mean()


def test(model, dataloader, use_gpu=True):
    """
    Vanilla function to run the inference on all test samples given in dataloader.

    :returns arrays of predictions and targets.
    """
    model.eval()

    use_gpu = use_gpu and torch.cuda.is_available()

    if use_gpu:
        model = model.cuda()

    logprobabilities = []
    targets_list = []
    polygon_ids_list = []

    for _, data in enumerate(dataloader):
        inputs, targets, polygon_ids, _ = data

        if use_gpu:
            inputs = inputs.cuda()
            targets = targets.cuda()

        targets_list.append(targets[:, 0].cpu().detach().numpy())
        logprobabilities.append(model.forward(inputs.transpose(1, 2)).cpu().detach().numpy())
        polygon_ids_list.append(polygon_ids.cpu().detach().numpy())

    logprobabilities = np.vstack(logprobabilities)
    predictions = logprobabilities.argmax(1)

    return predictions, np.concatenate(targets_list), np.concatenate(polygon_ids_list), logprobabilities


def train(model, optimizer, train_loader, validation_loader, epochs, logger, weights=None, wandb=None, verbose=True):
    """
    Vanilla function to run the inference on all train samples given in training dataloader.
    At each epoch end the loss and accuracy of samples from the validation loader are printed.
    """
    model.train()

    if torch.cuda.is_available():
        model = model.cuda()

    if weights and isinstance(weights, list):
        weights = torch.cuda.FloatTensor(weights)

    for epoch in range(epochs):
        train_loss_log = train_phase(
            model=model, train_loader=train_loader, optimizer=optimizer, weights=weights, verbose=verbose
        )

        targets_list, predictions_list, val_loss_log = val_phase(model=model, validation_loader=validation_loader)

        val_acc = accuracy_score(np.concatenate(targets_list), np.concatenate(predictions_list))

        if wandb:
            wandb.log(
                {
                    "Train Loss": train_loss_log.get(),
                    "Val Loss": val_loss_log.get(),
                    "Val Accuracy": val_acc,
                    "epoch": epoch,
                }
            )

        logger.info(
            f"Epoch {epoch}: train loss {train_loss_log.get():.3f} | "
            f"val loss {val_loss_log.get():.3f} | "
            f"val acc = {val_acc:.3f}"
        )

    return model


def train_phase(model, train_loader, optimizer, weights, verbose):
    train_loss_log = AverageMetric()
    model.train()

    for _, data in enumerate(train_loader):
        optimizer.zero_grad()

        inputs, targets, _, _ = data

        if torch.cuda.is_available():
            inputs = inputs.cuda()
            targets = targets.cuda()

        logprobabilities = model.forward(inputs.transpose(1, 2))

        loss = torch.nn.functional.nll_loss(logprobabilities, targets[:, 0], weight=weights)
        train_loss_log.add(loss.cpu().detach().numpy())

        loss.backward()
        optimizer.step()

        if verbose:
            print(loss.cpu().detach().numpy())

    return train_loss_log


def val_phase(model, validation_loader):
    val_loss_log = AverageMetric()
    model.eval()
    predictions_list = []
    targets_list = []
    for _, data in enumerate(validation_loader):
        inputs, targets, _, _ = data

        if torch.cuda.is_available():
            inputs = inputs.cuda()
            targets = targets.cuda()

        logprobabilities = model.forward(inputs.transpose(1, 2))
        loss = torch.nn.functional.nll_loss(logprobabilities, targets[:, 0])
        val_loss_log.add(loss.cpu().detach().numpy())

        targets_list.append(targets[:, 0].cpu().detach().numpy())
        predictions_list.append((logprobabilities.cpu().detach().numpy()).argmax(1))

    return targets_list, predictions_list, val_loss_log
