from typing import Callable, List

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset


class PolyDataset(Dataset):
    """Dataset of polygons with temporal features. Created from a pandas DataFrame."""

    def __init__(
        self,
        dataframe: pd.DataFrame,
        feature_cols: List[str],
        label_col: str,
        poly_id_col: str,
        doys_col: str,
        # valid_col: str,
        offline_transform: Callable = None,
        online_transform: Callable = None,
    ):
        """Create a dataset from pandas DataFrame.

        :param dataframe: Dataframe of features, labels and polygon ids.
        :type dataframe: pd.DataFrame
        :param feature_cols: Column names representing polygon features.
        :type feature_cols: list[str]
        :param label_col: Column name representing polygon label.
        :type label_col: str
        :param poly_id_col: Column name representing polygon id.
        :type poly_id_col: str
        :param doys_col: Column name representing DOY.
        :type doys_col: str
        :param valid_col: Column name representing valid observations.
        :type valid_col: str
        :param offline_transform: Transform used to process the samples at dataset creation. Performed only once.
            Defaults to None.
        :type offline_transform: callable, optional
        :param online_transform: Transform used to process the samples during fetch. Performed every time the sample
            is fetched. Defaults to None.
        :type online_transform: callable, optional
        """
        dataframe = dataframe.reset_index(drop=True)

        # Extract numpy arrays from dataframe
        features = dataframe[feature_cols].to_numpy()
        labels = dataframe[label_col].to_numpy()
        poly_ids = dataframe[poly_id_col].to_numpy()
        doys = dataframe[doys_col].to_numpy()
        # valid = dataframe[valid_col].to_numpy()

        groups = dataframe.groupby(poly_id_col)

        self.samples = []
        # Split data into samples (polygons)
        for indices in groups.indices.values():
            sample = {
                "features": features[indices],
                "label": labels[indices[0]],
                "poly_id": poly_ids[indices[0]],
                "doys": doys[indices],
                # 'valid': valid[indices]
            }

            if offline_transform is not None:
                sample = offline_transform(sample)

            self.samples.append(sample)

        self.online_transform = online_transform

    def __len__(self):
        return len(self.samples)

    # pylint: disable=not-callable
    def __getitem__(self, idx):
        if torch.is_tensor(idx):
            idx = idx.tolist()

        sample = self.samples[idx]

        # Online transform sample
        if self.online_transform is not None:
            sample = self.online_transform(sample)

        data = torch.from_numpy(sample["features"]).type(torch.FloatTensor)
        label = torch.from_numpy(np.array([sample["label"]])).type(torch.LongTensor)
        poly_id = torch.tensor(sample["poly_id"]).type(torch.LongTensor)
        doys = torch.from_numpy(sample["doys"]).type(torch.IntTensor)
        # valid = torch.from_numpy(sample['valid']).type(torch.BoolTensor)

        return data, label, poly_id, doys  # , valid
