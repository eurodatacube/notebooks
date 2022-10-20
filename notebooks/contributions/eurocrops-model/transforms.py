import numpy as np


def get_sample_n_timestamps(n_timestamps, pad_value=-1, generator=None):
    """Returns a transform that randomly samples n timestamps from the data.

    :param n_timestamps: number of timestamps to sample
    :type n_timestamps: int
    :param pad_value: Padding value used in case there are not enough timestamps to sample.
    :type pad_value: int, optional
    :param generator: numpy generator, defaults to None (random initialization)
    :type generator: np.random.Generator, optional
    """

    if not generator:
        generator = np.random.default_rng()

    def _transform(sample):
        """Sample is a dict with `'features'`, `'label'` and `'poly_id'` as fields"""
        data = sample["features"]
        doys = sample["doys"]
        t = len(data)

        if n_timestamps > t:
            npad = n_timestamps - t
            data = np.pad(data, [(0, npad), (0, 0)], "constant", constant_values=pad_value)
            doys = np.pad(doys, (0, npad), "edge")
        else:
            idxs = generator.choice(t, n_timestamps, replace=False)
            idxs.sort()
            data = data[idxs]
            doys = doys[idxs]

        new_sample = {
            "features": data,
            "label": sample["label"],
            "poly_id": sample["poly_id"],
            "doys": doys,
        }
        return new_sample

    return _transform
