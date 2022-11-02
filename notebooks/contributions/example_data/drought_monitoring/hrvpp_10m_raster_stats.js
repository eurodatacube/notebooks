function setup () {
  return {
    input: [
      {
        datasource: 'MRVPP',
        bands: ['LINT_anomaly', 'Annual_Drought_Pressure']
      },
      {
        datasource: 'VPP1',
        bands: ['TPROD', 'SPROD', 'QFLAG', 'LENGTH']
      },
      {
        datasource: 'VPP2',
        bands: ['TPROD', 'SPROD', 'QFLAG', 'LENGTH']
      },
      {
        datasource: 'INDICES',
        bands: ['CLAS_L', 'dataMask']
      }
    ],
    output: [
      {
        id: 'TPROD_minmax_YEAR0',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'SPROD_minmax_YEAR0',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Total_Drought_Impact_YEAR0',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Seasonal_Drought_Impact_YEAR0',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Season_Length_YEAR0',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Nb_Seasons_YEAR0',
        bands: 1,
        sampleType: SampleType.UINT8
      },
      {
        id: 'MR_drought_impact_YEAR0',
        bands: 1,
        sampleType: SampleType.UINT8
      }
    ],
    mosaicking: Mosaicking.ORBIT
  }
}

// Fixed parameters and declarations
const lintAnomalyThreshold = -0.5
const annualDroughtPressureThreshold = -1
const outputNoDataValue32bit = -9999
const outputNoDataValue8bit = 255
var YearlyHRVPPStats = {}
const f = 10000

function preProcessScenes (collections) {
  // Sort scenes by dateFrom in ascending order

  collections.MRVPP.scenes.orbits.sort(function (s1, s2) {
    var date1 = new Date(s1.dateFrom)
    var date2 = new Date(s2.dateFrom)
    return date1 - date2
  })
  collections.VPP1.scenes.orbits.sort(function (s1, s2) {
    var date1 = new Date(s1.dateFrom)
    var date2 = new Date(s2.dateFrom)
    return date1 - date2
  })
  collections.VPP2.scenes.orbits.sort(function (s1, s2) {
    var date1 = new Date(s1.dateFrom)
    var date2 = new Date(s2.dateFrom)
    return date1 - date2
  })

  return collections
}

function updateOutputMetadata (scenes, inputMetadata, outputMetadata) {
  outputMetadata.userData = {
    annualStatistics: YearlyHRVPPStats
  }
}
/////////////////////////////////////////////
// Helper functions
var getClca = function (n) {
  let strVal = n.toString()
  let clcaLcf = strVal.slice(strVal.length - 4)
  let clca = clcaLcf.slice(0, clcaLcf.length - 1)

  return parseInt(clca)
}

function isInt (n) {
  return n % 1 === 0
}

function qflagFilter (dataCollection, variable) {
  /// Return TPROD if Qflag >= 7
  var filteredProd = []
  for (let i = 0; i < dataCollection.length; i++) {
    if (dataCollection[i].QFLAG >= 7) {
      filteredProd.push(dataCollection[i][variable])
    } else {
      filteredProd.push(outputNoDataValue32bit)
    }
  }
  return filteredProd
}

function combineSeasons (season1, season2) {
  // Combine TPROD by adding if not nodata
  if (season1.length !== season2.length) {
    throw new Error("HRVPP seasons don't match!")
  }

  var combined = []
  for (let i = 0; i < season1.length; i++) {
    if (
      season1[i] !== outputNoDataValue32bit &&
      season2[i] === outputNoDataValue32bit
    ) {
      combined.push(season1[i])
    } else if (
      season1[i] === outputNoDataValue32bit &&
      season2[i] !== outputNoDataValue32bit
    ) {
      combined.push(season2[i])
    } else if (
      season1[i] !== outputNoDataValue32bit &&
      season2[i] !== outputNoDataValue32bit
    ) {
      combined.push(season1[i] + season2[i])
    } else {
      combined.push(outputNoDataValue32bit)
    }
  }
  return combined
}

function Scale (inArray, noDataValue) {
  // Filter for our noData
  let filterArr = inArray.filter(item => item !== noDataValue)

  // Get minimum and maximum of timeseries
  minArr = Math.min(...filterArr)
  maxArr = Math.max(...filterArr)

  // Compute scaled for each entry
  var xprime = []
  for (i = 0; i < inArray.length; i++) {
    if (
      inArray[i] == noDataValue ||
      isNaN(inArray[i] || inArray[i] == undefined)
    ) {
      xprime.push(noDataValue)
    } else {
      let prime = ((inArray[i] - minArr) / (maxArr - minArr)) * 100
      xprime.push(prime)
    }
  }
  return xprime
}

function computeScaling (samples, scenes, variable) {
  var currentScaling

  // Check if the years for the seasons are the same
  if (scenes.VPP1.scenes.length != scenes.VPP2.scenes.length) {
    currentScaling = outputNoDataValue32bit
  } else {
    // Record dates for indexing
    let Years = []
    for (let i = 0; i < scenes.VPP1.scenes.length; i++) {
      Years.push(scenes.VPP1.scenes[i].date.getFullYear())
    }

    // Filter VPP
    let filteredT1 = qflagFilter(samples.VPP1, variable)
    let filteredT2 = qflagFilter(samples.VPP2, variable)

    // Combine VPP TPROD seasons
    let Seasons = combineSeasons(filteredT1, filteredT2)

    // Compute TPROD scaling
    let scaling = Scale(Seasons, outputNoDataValue32bit)

    // Get current TRProdScaling
    let Index = Years.indexOf(scenes.MRVPP.scenes[0].date.getFullYear())
    currentScaling = scaling[Index]
  }
  return currentScaling
}

/////////////////////////////////////////////
// Stats
function updateYearlyStatistics (statsObject, year, nuts3, clc, lcf, hrVpp) {
  // Prepare fields in statsObject: Year
  if (!statsObject.hasOwnProperty(year)) {
    statsObject[year] = {}
  }
  // NUTS
  if (!statsObject[year].hasOwnProperty(nuts3)) {
    statsObject[year][nuts3] = {}
  }
  // CLC
  if (!statsObject[year][nuts3].hasOwnProperty(clc)) {
    statsObject[year][nuts3][clc] = {}
  }
  // LCF
  if (!statsObject[year][nuts3][clc].hasOwnProperty(lcf)) {
    statsObject[year][nuts3][clc][lcf] = {}
    statsObject[year][nuts3][clc][lcf].meanTotDroughtImpact = 0
    statsObject[year][nuts3][clc][lcf].samplesTotDroughtImpact = 0
    statsObject[year][nuts3][clc][lcf].meanAnnualSeasImpact = 0
    statsObject[year][nuts3][clc][lcf].samplesAnnualSeasImpact = 0
    statsObject[year][nuts3][clc][lcf].modeNrSeasons = {
      '1': 0,
      '2': 0
    }
    statsObject[year][nuts3][clc][lcf].meanS1S2Length = 0
    statsObject[year][nuts3][clc][lcf].samplesS1S2Length = 0
  }

  // Update statsObjects
  // Total Drought Impact
  if (
    hrVpp.TotalDroughtImpact !== -9999 &&
    isFinite(hrVpp.TotalDroughtImpact)
  ) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanTotDroughtImpact =
      (statsObject[year][nuts3][clc][lcf].meanTotDroughtImpact *
        statsObject[year][nuts3][clc][lcf].samplesTotDroughtImpact +
        hrVpp.TotalDroughtImpact) /
      (statsObject[year][nuts3][clc][lcf].samplesTotDroughtImpact + 1)
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesTotDroughtImpact++
  }

  // Annual Seasonal Drought impact
  if (
    hrVpp.SeasonalDroughtImpact !== -9999 &&
    isFinite(hrVpp.SeasonalDroughtImpact)
  ) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanAnnualSeasImpact =
      (statsObject[year][nuts3][clc][lcf].meanAnnualSeasImpact *
        statsObject[year][nuts3][clc][lcf].samplesAnnualSeasImpact +
        hrVpp.SeasonalDroughtImpact) /
      (statsObject[year][nuts3][clc][lcf].samplesAnnualSeasImpact + 1)
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesAnnualSeasImpact++
  }

  // Number of seasons mode
  if (hrVpp.seasonLength !== 0 && isFinite(hrVpp.seasonLength)) {
    // Mean
    statsObject[year][nuts3][clc][lcf].modeNrSeasons[hrVpp.NbSeasons]++
  }

  // Season length
  if (hrVpp.seasonLength !== 0 && isFinite(hrVpp.seasonLength)) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanS1S2Length =
      (statsObject[year][nuts3][clc][lcf].meanS1S2Length *
        statsObject[year][nuts3][clc][lcf].samplesS1S2Length +
        hrVpp.seasonLength) /
      (statsObject[year][nuts3][clc][lcf].samplesS1S2Length + 1)
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesS1S2Length++
  }

  return statsObject
}
/////////////////////////////////////////////
function evaluatePixel (samples, scenes) {
  if (
    scenes.MRVPP.scenes.length == 0 ||
    scenes.VPP1.scenes.length == 0 ||
    scenes.VPP2.scenes.length == 0 ||
    !samples.INDICES.length
  ) {
    return {
      TPROD_minmax_YEAR0: [outputNoDataValue32bit],
      SPROD_minmax_YEAR0: [outputNoDataValue32bit],
      Total_Drought_Impact_YEAR0: [outputNoDataValue32bit],
      Seasonal_Drought_Impact_YEAR0: [outputNoDataValue32bit],
      Season_Length_YEAR0: [outputNoDataValue32bit],
      Nb_Seasons_YEAR0: [outputNoDataValue8bit],
      MR_drought_impact_YEAR0: [outputNoDataValue8bit]
    }
  }

  var TprodScaling
  var SprodScaling
  var MRDroughtImpact

  // Compute TPROD scaling
  TprodScaling = computeScaling(samples, scenes, 'TPROD')

  // Compute SPROD scaling
  SprodScaling = computeScaling(samples, scenes, 'SPROD')

  // Compute MR drought impact binary mask
  if (
    samples.MRVPP[0].LINT_anomaly === outputNoDataValue32bit ||
    samples.MRVPP[0].Annual_Drought_Pressure === outputNoDataValue32bit
  ) {
    MRDroughtImpact = outputNoDataValue32bit
  } else if (
    samples.MRVPP[0].LINT_anomaly < lintAnomalyThreshold &&
    samples.MRVPP[0].Annual_Drought_Pressure < annualDroughtPressureThreshold
  ) {
    MRDroughtImpact = 1
  } else {
    MRDroughtImpact = 0
  }

  // Compute Total Drought Impact & Seasonal Drought Impact
  var TotalDroughtImpact = []
  var SeasonalDroughtImpact = []

  if (MRDroughtImpact === 1) {
    TotalDroughtImpact.push(TprodScaling)
    SeasonalDroughtImpact.push(SprodScaling)
  } else {
    TotalDroughtImpact.push(outputNoDataValue32bit)
    SeasonalDroughtImpact.push(outputNoDataValue32bit)
  }

  // Get season length
  var seasonLength = []
  var nbSeasons = 0

  if (scenes.VPP1.scenes.length != scenes.VPP2.scenes.length) {
    seasonLength.push(outputNoDataValue32bit)
  } else {
    // Record dates for indexing
    let vppYears = []
    for (let i = 0; i < scenes.VPP1.scenes.length; i++) {
      vppYears.push(scenes.VPP1.scenes[i].date.getFullYear())
    }
    var seasonIndex = vppYears.indexOf(
      scenes.MRVPP.scenes[0].date.getFullYear()
    )

    let S1length = []
    let S2length = []

    for (let i = 0; i < samples.VPP1.length; i++) {
      S1length.push(samples.VPP1[i].LENGTH)
    }
    for (let i = 0; i < samples.VPP2.length; i++) {
      S2length.push(samples.VPP2[i].LENGTH)
    }

    seasonLength.push(combineSeasons(S1length, S2length)[seasonIndex])

    // Get number of seasons per year
    if (samples.VPP1[seasonIndex]) {
      if (samples.VPP1[seasonIndex].LENGTH !== 0) {
        nbSeasons += 1
      }
      if (samples.VPP2[seasonIndex].LENGTH !== 0) {
        nbSeasons += 1
      }
    }
  }
  // Compute statistics
  // Get values from index
  var index = samples.INDICES[0].CLAS_L

  let indexString = index.toString()

  // LCF
  var LCF = parseInt(indexString.slice(indexString.length - 1))

  // NUTS
  var NUTS = Math.floor(index / f)

  // CLCA
  CLCA = getClca(index)

  // Make object for Statistics
  var allValues = {
    TotalDroughtImpact: TotalDroughtImpact[0],
    SeasonalDroughtImpact: SeasonalDroughtImpact[0],
    NbSeasons: nbSeasons,
    seasonLength: seasonLength[0]
  }

  if (
    Number.isInteger(NUTS) &&
    Number.isInteger(CLCA) &&
    Number.isInteger(LCF)
  ) {
    YearlyHRVPPStats = updateYearlyStatistics(
      YearlyHRVPPStats,
      YEAR0,
      NUTS,
      CLCA,
      LCF,
      allValues
    )
  }

  return {
    TPROD_minmax_YEAR0: [TprodScaling],
    SPROD_minmax_YEAR0: [SprodScaling],
    Total_Drought_Impact_YEAR0: TotalDroughtImpact,
    Seasonal_Drought_Impact_YEAR0: SeasonalDroughtImpact,
    Season_Length_YEAR0: seasonLength,
    Nb_Seasons_YEAR0: [nbSeasons],
    MR_drought_impact_YEAR0: [MRDroughtImpact]
  }
}
