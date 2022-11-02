//VERSION=3
function setup () {
  return {
    input: [
      {
        datasource: 'SM',
        bands: ['anomaly']
      },
      {
        datasource: 'TIMESAT',
        bands: ['dsos', 'deos', 'LINT']
      },
      {
        datasource: 'INDICES',
        bands: ['CLAS_L', 'dataMask']
      }
    ],
    output: [
      {
        id: 'Long_Term_Soil_Moisture',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Long_Term_Drought_Pressure_Intensity',
        bands: 1,
        sampleType: SampleType.FLOAT32
      }
    ],
    mosaicking: Mosaicking.ORBIT
  }
}

// Fixed parameters and declarations
const outputNoDataValue32bit = -9999
const outputNoDataValue8bit = 255
const noDataValues = {
  SM: {
    anomaly: -9999
  },
  TIMESAT: {
    dsos: 0,
    deos: 0,
    LINT: 0
  }
}

var TimelessMRVPPStats = {}
const f = 10000

function preProcessScenes (collections) {
  // Sort scenes by dateFrom in ascending order

  collections.SM.scenes.orbits.sort(function (s1, s2) {
    var date1 = new Date(s1.dateFrom)
    var date2 = new Date(s2.dateFrom)
    return date1 - date2
  })
  collections.TIMESAT.scenes.orbits.sort(function (s1, s2) {
    var date1 = new Date(s1.dateFrom)
    var date2 = new Date(s2.dateFrom)
    return date1 - date2
  })

  return collections
}

// Statistics output
function updateOutputMetadata (scenes, inputMetadata, outputMetadata) {
  outputMetadata.userData = {
    droughtTimeless: TimelessMRVPPStats
  }
}

///////////////////////////////
// Misc functions
const average = array => array.reduce((a, b) => a + b) / array.length

function clamp_neg_3_3 (value) {
  return Math.min(Math.max(value, -3), 3)
}

function yydoyToDate (yydoy) {
  if (yydoy > 30000) {
    return NaN // This should probably be fixed in the data
  }
  fullYearYydoy = String(yydoy + 2000000)
  year = parseInt(fullYearYydoy.slice(0, -3))
  doy = parseInt(fullYearYydoy.slice(-3))
  return yearDoyToDate(year, doy)
}

function yearDoyToDate (year, doy) {
  const date = new Date(year, 0)
  return new Date(date.setDate(doy))
}

function computeMeanAndStd (inArray, noDataValue) {
  // Mean
  let total = 0
  let dataLength = 0
  for (let i = 0; i < inArray.length; i++) {
    if (inArray[i] != noDataValue && !isNaN(inArray[i])) {
      total += inArray[i]
      dataLength += 1
    }
  }
  const mean = total / dataLength

  // Standard deviation
  let varinace = 0
  for (let i = 0; i < inArray.length; i++) {
    if (inArray[i] != noDataValue && !isNaN(inArray[i])) {
      let t = inArray[i] - mean
      varinace += (t * t) / dataLength
    }
  }
  const std = Math.sqrt(varinace)

  return [mean, std]
}

function getUniqueYears (indates) {
  // From a list of dates return the unique list of years
  let years = []
  for (let i = 0; i < indates.length; i++) {
    years.push(indates[i].getFullYear())
  }
  let unique = [...new Set(years)]
  return unique
}

function flatten (arr) {
  return [].concat(...arr)
}

var getClca = function (n) {
  let strVal = n.toString()
  let clcaLcf = strVal.slice(strVal.length - 4)
  let clca = clcaLcf.slice(0, clcaLcf.length - 1)

  return parseInt(clca)
}
////////////////////////
// EEA functions

function computeSmaClamped (
  anomalySamples,
  anomalyScenes,
  timesatSamples,
  timesatScenes,
  smaNoDataValue
) {
  // This function computes the Soil Moisture (sos-3 months to eos)
  // for each year. Returns an object containing for each year the samples and the dates
  // Initialise object
  let allYearsSamples = {}

  for (let iYear = 0; iYear < timesatSamples.length; iYear++) {
    // Initialise arrays
    let selectedDates = []
    let samplesInGrowingSeason = []

    // Compute SOS - 3 months and EOS
    let startSeason = yydoyToDate(timesatSamples[iYear].dsos)

    if (!startSeason) {
      // If no start season put it to the 2nd Jan so that the rest of
      // the code deals with it
      startSeason = new Date(timesatScenes[iYear].date.getFullYear(), 0, 2)
    } else {
      startSeason.setMonth(startSeason.getMonth() - 3) //3 months earlier
    }
    // If no eos, put it to the same date as no sos, therefore no
    // dates will be in the interval and the no data pixel is caught
    let endSeason = yydoyToDate(timesatSamples[iYear].deos)
    if (!endSeason) {
      endSeason = new Date(timesatScenes[iYear].date.getFullYear(), 0, 2)
    }

    // Loop over anomaly scenes
    for (let i = 0; i < anomalyScenes.length; i++) {
      if (
        anomalyScenes[i].date > startSeason &&
        anomalyScenes[i].date < endSeason
      ) {
        // Save the date
        selectedDates.push(anomalyScenes[i].date)

        // Push value if data
        if (anomalySamples[i].anomaly != smaNoDataValue) {
          // Filter SMA (clamped to -3,3) and filter to growing season
          let clampedAnomaly = clamp_neg_3_3(anomalySamples[i].anomaly)
          // Calculate drought hazard by clamping to zero
          samplesInGrowingSeason.push(clampedAnomaly)
        } else {
          samplesInGrowingSeason.push(outputNoDataValue32bit)
        }
      }
    }
    // Create an entry for each year found in timesat
    allYearsSamples[timesatScenes[iYear].date.getFullYear()] = {}
    // Push the samples and dates for each year
    allYearsSamples[
      timesatScenes[iYear].date.getFullYear()
    ].samples = samplesInGrowingSeason
    allYearsSamples[
      timesatScenes[iYear].date.getFullYear()
    ].dates = selectedDates
  }
  return allYearsSamples
}

function computeDroughtHazard (inputObj) {
  // This function computes the seasonal drought Hazard
  // for each year. Returns an object containing for each
  // year the samples and the dates.
  var annual = {}
  // Loop years in the input Object
  Object.keys(inputObj).forEach(key => {
    // Return the years in an array
    annual[key] = { samples: [], dates: [] }
    for (let i = 0; i < inputObj[key].samples.length; i++) {
      if (inputObj[key].samples[i] <= -1) {
        annual[key].samples.push(inputObj[key].samples[i])
      } else {
        annual[key].samples.push(outputNoDataValue32bit)
      }
      annual[key].dates.push(inputObj[key].dates[i])
    }
  })
  return annual
}

function computeAnnual (inputObj) {
  // Compute annual drought severity based on the Hazard object
  // Start by computing years from Hazard object keys
  let uniqueYears = Object.keys(inputObj)

  // Set years to be returned, initialise yearly array
  var annual = {}

  // Loop the years
  uniqueYears.forEach((key, index) => {
    // Return the years in an array
    annual[key] = {}
    // Clean samples removing no data
    arr = inputObj[key].samples.filter(item => item !== outputNoDataValue32bit)

    // Compute average
    var avg = outputNoDataValue32bit
    if (arr.length) {
      avg = average(arr)
    }
    annual[key].value = avg
  })

  return annual
}

function computeAnnualDroughtPressure (drought) {
  // Compute the minimum drought for each season and the month
  var annualPressure = {}
  // Loop years in the input drought Object
  Object.keys(drought).forEach(key => {
    annualPressure[key] = { value: [], month: [] }

    // Get array of non nodata
    var pressureValues = []
    if (drought[key].samples.length) {
      pressureValues = drought[key].samples.filter(
        item => item !== outputNoDataValue32bit
      )
    }
    // If empty return nodata
    if (pressureValues.length) {
      // Get value
      let minVal = Math.min.apply(null, pressureValues)
      annualPressure[key].value = minVal
      // Get month
      let ind = drought[key].samples.indexOf(minVal)
      // Make it a real month value
      annualPressure[key].month = drought[key].dates[ind].getMonth() + 1
    } else {
      annualPressure[key].value = outputNoDataValue32bit
      annualPressure[key].month = outputNoDataValue8bit
    }
  })

  return annualPressure
}

function computeLongtermAverageArray (inArr) {
  // Compute the long term average of a yearly object
  // Loop through Object and add information

  // Remove -9999
  let ndInd = inArr.indexOf(outputNoDataValue32bit)
  if (ndInd !== -1) {
    avgArray.splice(ndInd, 1)
  }
  // If not empty
  var longTerm = []
  if (avgArray.length) {
    longTerm.push(average(avgArray))
  } else {
    longTerm.push(outputNoDataValue32bit)
  }
  return longTerm
}

function computeLongtermAverage (inputObj) {
  // Compute the long term average of a yearly object
  // Loop through Object and add information
  var avgArray = []
  Object.keys(inputObj).forEach(key => {
    avgArray.push(inputObj[key].value)
  })
  // Remove -9999
  let ndInd = avgArray.indexOf(outputNoDataValue32bit)
  if (ndInd !== -1) {
    avgArray.splice(ndInd, 1)
  }
  // If not empty
  var longTerm = []
  if (avgArray.length) {
    longTerm.push(average(avgArray))
  } else {
    longTerm.push(outputNoDataValue32bit)
  }
  return longTerm
}

function updateTimelessStatistics (statsObject, nuts3, clc, lcf, value) {
  // Check validity of the area codes

  // NUTS
  if (!statsObject.hasOwnProperty(nuts3)) {
    statsObject[nuts3] = {}
  }
  // CLC
  if (!statsObject[nuts3].hasOwnProperty(clc)) {
    statsObject[nuts3][clc] = {}
  }
  // LCF
  if (!statsObject[nuts3][clc].hasOwnProperty(lcf)) {
    statsObject[nuts3][clc][lcf] = {}
    statsObject[nuts3][clc][lcf].meanSoilMoisture = 0
    statsObject[nuts3][clc][lcf].samplesSoilMoisture = 0
    statsObject[nuts3][clc][lcf].meanDroughtPressureIntensity = 0
    statsObject[nuts3][clc][lcf].minDroughtPressureIntensity = 9999
    statsObject[nuts3][clc][lcf].samplesDroughtPressureIntensity = 0
  }

  // Update statsObjects
  // SOIL MOISTURE
  if (value.Long_Term_Soil_Moisture !== -9999) {
    // Mean
    statsObject[nuts3][clc][lcf].meanSoilMoisture =
      (statsObject[nuts3][clc][lcf].meanSoilMoisture *
        statsObject[nuts3][clc][lcf].samplesSoilMoisture +
        value.Long_Term_Soil_Moisture) /
      (statsObject[nuts3][clc][lcf].samplesSoilMoisture + 1)
    // Samples
    statsObject[nuts3][clc][lcf].samplesSoilMoisture++
  }

  // DROUGHT PRESSURE INTENSITY
  if (value.Long_Term_Drought_Pressure_Intensity !== -9999) {
    // Mean
    statsObject[nuts3][clc][lcf].meanDroughtPressureIntensity =
      (statsObject[nuts3][clc][lcf].meanDroughtPressureIntensity *
        statsObject[nuts3][clc][lcf].samplesDroughtPressureIntensity +
        value.Long_Term_Drought_Pressure_Intensity) /
      (statsObject[nuts3][clc][lcf].samplesDroughtPressureIntensity + 1)
    // Min
    if (
      statsObject[nuts3][clc][lcf].minDroughtPressureIntensity >
      value.Long_Term_Drought_Pressure_Intensity
    ) {
      statsObject[nuts3][clc][lcf].minDroughtPressureIntensity =
        value.Long_Term_Drought_Pressure_Intensity
    }
    // Samples
    statsObject[nuts3][clc][lcf].samplesDroughtPressureIntensity++
  }

  return statsObject
}

/////////////////////////////////////////////
function evaluatePixel (samples, scenes) {
  // For Batch
  if (
    !samples.SM.length ||
    !samples.TIMESAT.length ||
    !samples.INDICES.length
  ) {
    return {
      Long_Term_Soil_Moisture: [outputNoDataValue32bit],
      Long_Term_Drought_Pressure_Intensity: [outputNoDataValue32bit]
    }
  }

  // Compute SMA clamped to [-3;3] within the GS
  let clampedSoilMoisture = computeSmaClamped(
    samples.SM,
    scenes.SM.scenes,
    samples.TIMESAT,
    scenes.TIMESAT.scenes,
    noDataValues.SM.anomaly
  )

  // Convert to Array (removing -9999)
  var allSoilMoistureArray = []
  for (let year in clampedSoilMoisture) {
    for (let i = 0; i < clampedSoilMoisture[year].samples.length; i++) {
      if (clampedSoilMoisture[year].samples[i] !== outputNoDataValue32bit) {
        allSoilMoistureArray.push(clampedSoilMoisture[year].samples[i])
      }
    }
  }

  // Compute Long term average soil moisture
  var longTermSoilMoisture = []
  if (allSoilMoistureArray.length) {
    longTermSoilMoisture.push(average(allSoilMoistureArray))
  } else {
    longTermSoilMoisture.push(outputNoDataValue32bit)
  }

  // Compute Drought Hazard
  var droughtHazard = computeDroughtHazard(clampedSoilMoisture)

  // Compute (Annual) drought pressure intensity
  var droughtPressureIntensity = computeAnnualDroughtPressure(droughtHazard)

  // Convert to Array
  var annualDroughtPressureIntensity = []
  // Loop through Object and add information
  Object.keys(droughtPressureIntensity).forEach(key => {
    annualDroughtPressureIntensity.push(droughtPressureIntensity[key].value)
  })

  // Compute (LONG TERM AVERAGE) Drought Pressure Intensity
  // Remove -9999
  var avgArray = []
  for (let i = 0; i < annualDroughtPressureIntensity.length; i++) {
    if (annualDroughtPressureIntensity[i] !== outputNoDataValue32bit) {
      avgArray.push(annualDroughtPressureIntensity[i])
    }
  }
  // If not empty
  var longTermDrought = []
  if (avgArray.length) {
    longTermDrought.push(average(avgArray))
  } else {
    longTermDrought.push(outputNoDataValue32bit)
  }

  var extractionData = {
    Long_Term_Soil_Moisture: longTermSoilMoisture[0],
    Long_Term_Drought_Pressure_Intensity: longTermDrought[0]
  }

  // Get values from index
  var index = samples.INDICES[0].CLAS_L
  let indexString = index.toString()

  // LCF
  var LCF = parseInt(indexString.slice(indexString.length - 1))

  // NUTS
  var NUTS = Math.floor(index / f)

  // CLCA
  var CLCA = getClca(index)

  // Get statistics for the Timeless products
  if (
    Number.isInteger(NUTS) &&
    Number.isInteger(CLCA) &&
    Number.isInteger(LCF)
  ) {
    TimelessMRVPPStats = updateTimelessStatistics(
      TimelessMRVPPStats,
      NUTS,
      CLCA,
      LCF,
      extractionData
    )
  }

  return {
    Long_Term_Soil_Moisture: [longTermSoilMoisture[0]],
    Long_Term_Drought_Pressure_Intensity: [longTermDrought[0]]
  }
}
