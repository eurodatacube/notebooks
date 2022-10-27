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
        bands: ['dsos', 'deos']
      },
      {
        datasource: 'TIMESATLONG',
        bands: ['LINT']
      },
      {
        datasource: 'INDICES',
        bands: ['CLAS_L', 'dataMask']
      }
    ],
    output: [
      {
        id: 'Annual_Soil_Moisture_YEAR1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Annual_Drought_Pressure_YEAR1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Annual_Drought_Pressure_Intensity_YEAR1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'LINT_anomaly_YEAR1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Drought_Impact_YEAR1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Drought_Impact_Mask_YEAR1',
        bands: 1,
        sampleType: SampleType.UINT8
      },
      {
        id: 'Drought_Impact_Intensity_YEAR1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Drought_Impact_Intensity_Mask_YEAR1',
        bands: 1,
        sampleType: SampleType.UINT8
      },
      {
        id: 'Drought_Pressure_Month_YEAR1',
        bands: 1,
        sampleType: SampleType.UINT8
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_2',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_3',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_4',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_5',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_6',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_7',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_8',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_9',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_10',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_11',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR1_12',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_1',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_2',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_3',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_4',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_5',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_6',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_7',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_8',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_9',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_10',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_11',
        bands: 1,
        sampleType: SampleType.FLOAT32
      },
      {
        id: 'Monthly_Drought_Hazard_YEAR0_12',
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
    sos: 0,
    eos: 0,
    LINT: 0
  }
}
var YearlyMRVPPStats = {}
var MonthlyMRVPPStats = {}
const f = 10000

// Statistics output
function updateOutputMetadata (scenes, inputMetadata, outputMetadata) {
  outputMetadata.userData = {
    droughtYearly: YearlyMRVPPStats,
    droughtMonthly: MonthlyMRVPPStats
  }
}

// Sort scenes by dateFrom in ascending order
function preProcessScenes (collections) {
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
  collections.TIMESATLONG.scenes.orbits.sort(function (s1, s2) {
    var date1 = new Date(s1.dateFrom)
    var date2 = new Date(s2.dateFrom)
    return date1 - date2
  })

  return collections
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
  let variance = 0
  for (let i = 0; i < inArray.length; i++) {
    if (inArray[i] != noDataValue && !isNaN(inArray[i])) {
      let t = inArray[i] - mean
      variance += (t * t) / dataLength
    }
  }
  const std = Math.sqrt(variance)

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

function noUndefined (arr, noDataValue) {
  var newArr = []
  if (arr[0] !== undefined) {
    newArr.push(arr[0])
  } else {
    newArr.push(noDataValue)
  }
  return newArr
}

var getClca = function (n) {
  let strVal = n.toString()
  let clcaLcf = strVal.slice(strVal.length - 4)
  let clca = clcaLcf.slice(0, clcaLcf.length - 1)

  return parseInt(clca)
}

function isInt (n) {
  return n % 1 === 0
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

function computeMonthlyDrought (drought) {
  // Compute the average drought for each month
  // Start by computing years from Hazard object keys
  let uniqueYears = Object.keys(drought)

  // Set years to be returned, initialise yearly array
  var monthlyDrought = {}

  // Loop through the object to get all dates and values
  var allMonthlyDates = []
  var allMonthlySamples = []

  uniqueYears.forEach((key, index) => {
    // Return the dates and samples in an array
    allMonthlyDates.push(drought[key].dates)
    allMonthlySamples.push(drought[key].samples)
  })

  // Get unique Years (there may be more if seasons overlap)
  let dates = flatten(allMonthlyDates)
  let samples = flatten(allMonthlySamples)

  let allUniqueYears = getUniqueYears(flatten(allMonthlyDates))

  // For each month collect drought values
  // Loop over years
  for (let i = 0; i < allUniqueYears.length; i++) {
    // Set year
    monthlyDrought[allUniqueYears[i]] = {}
    // Loop over months
    for (let j = 0; j < 12; j++) {
      let current_month = []
      // Loop over the samples in the drought dataset
      for (let k = 0; k < samples.length; k++) {
        if (
          dates[k].getFullYear() == allUniqueYears[i] &&
          dates[k].getMonth() == j
        ) {
          current_month.push(samples[k])
        }
      }
      // Remove no data
      if (current_month.length) {
        let currentMonthNoInf = []
        for (let i = 0; i < current_month.length; i++) {
          if (current_month[i] !== outputNoDataValue32bit) {
            currentMonthNoInf.push(current_month[i])
          }
        }
        if (currentMonthNoInf.length) {
          monthlyDrought[allUniqueYears[i]][j] = average(currentMonthNoInf)
        } else {
          monthlyDrought[allUniqueYears[i]][j] = outputNoDataValue32bit
        }
      } else {
        monthlyDrought[allUniqueYears[i]][j] = outputNoDataValue32bit
      }
    }
  }
  return monthlyDrought
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

function computeAnomaly (inArray, noDataValue) {
  meanStd = computeMeanAndStd(inArray, noDataValue)
  anomaly = []
  for (i = 0; i < inArray.length; i++) {
    if (inArray[i] == noDataValue || isNaN(inArray[i])) {
      anomaly.push(outputNoDataValue32bit)
    } else {
      anomaly.push((inArray[i] - meanStd[0]) / meanStd[1])
    }
  }
  return anomaly
}
/////////////////////////////////////////////
// Statistics Functions

function updateYearlyStatistics (statsObject, year, nuts3, clc, lcf, value) {
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
    statsObject[year][nuts3][clc][lcf].meanSoilMoisture = 0
    statsObject[year][nuts3][clc][lcf].samplesSoilMoisture = 0
    statsObject[year][nuts3][clc][lcf].meanDroughtPressure = 0
    statsObject[year][nuts3][clc][lcf].minDroughtPressure =
      Number.POSITIVE_INFINITY
    statsObject[year][nuts3][clc][lcf].samplesDroughtPressure = 0
    statsObject[year][nuts3][clc][lcf].meanDroughtPressureIntensity = 0
    statsObject[year][nuts3][clc][lcf].minDroughtPressureIntensity =
      Number.POSITIVE_INFINITY
    statsObject[year][nuts3][clc][lcf].monthDroughtPressureIntensity = 0
    statsObject[year][nuts3][clc][lcf].samplesDroughtPressureIntensity = 0
    statsObject[year][nuts3][clc][lcf].meanDroughtImpact = 0
    statsObject[year][nuts3][clc][lcf].minDroughtImpact =
      Number.POSITIVE_INFINITY
    statsObject[year][nuts3][clc][lcf].samplesDroughtImpact = 0
    statsObject[year][nuts3][clc][lcf].meanDroughtImpactIntensity = 0
    statsObject[year][nuts3][clc][lcf].minDroughtImpactIntensity =
      Number.POSITIVE_INFINITY
    statsObject[year][nuts3][clc][lcf].samplesDroughtImpactIntensity = 0
  }

  // Update statsObjects
  // ANNUAL SOIL MOISTURE
  if (
    value.Annual_Soil_Moisture !== -9999 &&
    isFinite(value.Annual_Soil_Moisture)
  ) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanSoilMoisture =
      (statsObject[year][nuts3][clc][lcf].meanSoilMoisture *
        statsObject[year][nuts3][clc][lcf].samplesSoilMoisture +
        value.Annual_Soil_Moisture) /
      (statsObject[year][nuts3][clc][lcf].samplesSoilMoisture + 1)
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesSoilMoisture++
  }

  // ANNUAL DROUGHT PRESSURE
  if (
    value.Annual_Drought_Pressure !== -9999 &&
    isFinite(value.Annual_Drought_Pressure)
  ) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanDroughtPressure =
      (statsObject[year][nuts3][clc][lcf].meanDroughtPressure *
        statsObject[year][nuts3][clc][lcf].samplesDroughtPressure +
        value.Annual_Drought_Pressure) /
      (statsObject[year][nuts3][clc][lcf].samplesDroughtPressure + 1)
    // Min
    if (
      statsObject[year][nuts3][clc][lcf].minDroughtPressure >
      value.Annual_Drought_Pressure
    ) {
      statsObject[year][nuts3][clc][lcf].minDroughtPressure =
        value.Annual_Drought_Pressure
    }
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesDroughtPressure++
  }

  // ANNUAL DROUGHT PRESSURE INTENSITY
  if (
    value.Annual_Drought_Pressure_Intensity !== -9999 &&
    isFinite(value.Annual_Drought_Pressure_Intensity)
  ) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanDroughtPressureIntensity =
      (statsObject[year][nuts3][clc][lcf].meanDroughtPressureIntensity *
        statsObject[year][nuts3][clc][lcf].samplesDroughtPressureIntensity +
        value.Annual_Drought_Pressure_Intensity) /
      (statsObject[year][nuts3][clc][lcf].samplesDroughtPressureIntensity + 1)
    // Min
    if (
      statsObject[year][nuts3][clc][lcf].minDroughtPressureIntensity >
      value.Annual_Drought_Pressure_Intensity
    ) {
      statsObject[year][nuts3][clc][lcf].minDroughtPressureIntensity =
        value.Annual_Drought_Pressure_Intensity
      // Month
      statsObject[year][nuts3][clc][lcf].monthDroughtPressureIntensity =
        value.Drought_Pressure_Month
    }
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesDroughtPressureIntensity++
  }

  // ANNUAL DROUGHT IMPACT
  if (value.Drought_Impact !== -9999 && isFinite(value.Drought_Impact)) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanDroughtImpact =
      (statsObject[year][nuts3][clc][lcf].meanDroughtImpact *
        statsObject[year][nuts3][clc][lcf].samplesDroughtImpact +
        value.Drought_Impact) /
      (statsObject[year][nuts3][clc][lcf].samplesDroughtImpact + 1)
    // Min
    if (
      statsObject[year][nuts3][clc][lcf].minDroughtImpact > value.Drought_Impact
    ) {
      statsObject[year][nuts3][clc][lcf].minDroughtImpact = value.Drought_Impact
    }
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesDroughtImpact++
  }

  // ANNUAL DROUGHT IMPACT INTENSITY
  if (
    value.Drought_Impact_Intensity !== -9999 &&
    isFinite(value.Drought_Impact_Intensity)
  ) {
    // Mean
    statsObject[year][nuts3][clc][lcf].meanDroughtImpactIntensity =
      (statsObject[year][nuts3][clc][lcf].meanDroughtImpactIntensity *
        statsObject[year][nuts3][clc][lcf].samplesDroughtImpactIntensity +
        value.Drought_Impact) /
      (statsObject[year][nuts3][clc][lcf].samplesDroughtImpactIntensity + 1)
    // Min
    if (
      statsObject[year][nuts3][clc][lcf].minDroughtImpactIntensity >
      value.Drought_Impact_Intensity
    ) {
      statsObject[year][nuts3][clc][lcf].minDroughtImpactIntensity =
        value.Drought_Impact_Intensity
    }
    // Samples
    statsObject[year][nuts3][clc][lcf].samplesDroughtImpactIntensity++
  }

  return statsObject
}

function updateMonthlyStatistics (
  statsObject,
  year,
  indmonth,
  nuts3,
  clc,
  lcf,
  value
) {
  // Get real months
  let month = indmonth + 1
  // Prepare fields in statsObject: Year
  if (!statsObject.hasOwnProperty(year)) {
    statsObject[year] = {}
  }
  // MONTH
  if (!statsObject[year].hasOwnProperty(month)) {
    statsObject[year][month] = {}
  }
  // NUTS
  if (!statsObject[year][month].hasOwnProperty(nuts3)) {
    statsObject[year][month][nuts3] = {}
  }
  // CLC
  if (!statsObject[year][month][nuts3].hasOwnProperty(clc)) {
    statsObject[year][month][nuts3][clc] = {}
  }
  // LCF
  if (!statsObject[year][month][nuts3][clc].hasOwnProperty(lcf)) {
    statsObject[year][month][nuts3][clc][lcf] = {}
    statsObject[year][month][nuts3][clc][lcf].meanDroughtHazard = 0
    statsObject[year][month][nuts3][clc][lcf].samplesDroughtHazard = 0
  }

  // Update statsObjects
  if (value !== -9999 && isFinite(value)) {
    // Mean
    statsObject[year][month][nuts3][clc][lcf].meanDroughtHazard =
      (statsObject[year][month][nuts3][clc][lcf].meanDroughtHazard *
        statsObject[year][month][nuts3][clc][lcf].samplesDroughtHazard +
        value) /
      (statsObject[year][month][nuts3][clc][lcf].samplesDroughtHazard + 1)
    // Samples
    statsObject[year][month][nuts3][clc][lcf].samplesDroughtHazard++
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
      Annual_Soil_Moisture_YEAR1: [outputNoDataValue32bit],
      Annual_Drought_Pressure_YEAR1: [outputNoDataValue32bit],
      Annual_Drought_Pressure_Intensity_YEAR1: [outputNoDataValue32bit],
      LINT_anomaly_YEAR1: [outputNoDataValue32bit],
      Drought_Impact_YEAR1: [outputNoDataValue32bit],
      Drought_Impact_Mask_YEAR1: [outputNoDataValue32bit],
      Drought_Impact_Intensity_YEAR1: [outputNoDataValue32bit],
      Drought_Impact_Intensity_Mask_YEAR1: [outputNoDataValue32bit],
      Drought_Pressure_Month_YEAR1: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_1: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_2: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_3: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_4: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_5: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_6: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_7: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_8: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_9: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_10: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_11: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR0_12: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_1: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_2: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_3: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_4: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_5: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_6: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_7: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_8: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_9: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_10: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_11: [outputNoDataValue32bit],
      Monthly_Drought_Hazard_YEAR1_12: [outputNoDataValue32bit]
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

  // Compute the ANNUAL SOIL MOISTURE
  var asm = computeAnnual(clampedSoilMoisture)
  // Convert Annual Soil Moisture to Array
  var annualSoilMoistureArray = []
  var SoilMoistureYears = []
  for (let year in asm) {
    annualSoilMoistureArray.push(asm[year].value)
    SoilMoistureYears.push(year)
  }

  // Compute Drought Hazard
  var droughtHazard = computeDroughtHazard(clampedSoilMoisture)
  // Convert Drought Hazard to Array
  var droughtHazardArray = []
  for (let year in droughtHazard) {
    for (let i = 0; i < droughtHazard[year].samples.length; i++) {
      droughtHazardArray.push(droughtHazard[year].samples[i])
    }
  }

  // Compute (Monthly Averaged) Drought Hazard
  var monthlyDrought = computeMonthlyDrought(droughtHazard)

  // Force consider last year if not
  if (!('YEAR0' in monthlyDrought)) {
    monthlyDrought['YEAR0'] = {}
    for (let k = 0; k < 12; k++) {
      monthlyDrought['YEAR0'][k] = outputNoDataValue32bit
    }
  }
  // Convert to Array
  var monthlyDroughtArray = []
  var monthlyDates = []
  // Loop through Object
  Object.keys(monthlyDrought).forEach(key => {
    Object.keys(monthlyDrought[key]).forEach(subkey => {
      // Make real months
      monthlyDates.push(new Date(parseInt(key), parseInt(subkey)))
      // iterate over every value in the object and push it in array
      monthlyDroughtArray.push(monthlyDrought[key][subkey])
    })
  })

  // Compute (Annual) Drought Pressure
  var annualDrought = computeAnnual(droughtHazard)
  // Convert to Array
  var annualDroughtArray = []
  var droughtYears = []
  for (let year in annualDrought) {
    annualDroughtArray.push(annualDrought[year].value)
    droughtYears.push(year)
  }

  // Compute (Annual) drought pressure intensity
  var droughtPressureIntensity = computeAnnualDroughtPressure(droughtHazard)
  // Convert to Array
  var annualDroughtPressureIntensity = []
  var annualDroughtMonth = []
  // Loop through Object and add information
  Object.keys(droughtPressureIntensity).forEach(key => {
    annualDroughtPressureIntensity.push(droughtPressureIntensity[key].value)
    annualDroughtMonth.push(droughtPressureIntensity[key].month)
  })

  // Compute LINT anomaly
  var allLint = []
  for (let i = 0; i < samples.TIMESATLONG.length; i++) {
    {
      if (samples.TIMESATLONG[i].LINT !== noDataValues.TIMESAT.LINT) {
        {
          allLint.push(samples.TIMESATLONG[i].LINT)
        }
      }
    }
  }
  var lintAnomaly
  if (allLint.length) {
    {
      lintAnomaly = computeAnomaly(allLint, outputNoDataValue32bit)
    }
  } else {
    {
      lintAnomaly = outputNoDataValue32bit
    }
  }

  // Get array of years
  var lintYears = []
  for (let i = 0; i < scenes.TIMESATLONG.scenes.length; i++) {
    {
      lintYears.push(scenes.TIMESATLONG.scenes[i].date.getFullYear())
    }
  }

  var lintIndex = lintYears.indexOf(YEAR1)

  // Compute (ANNUAL) AVERAGE DROUGHT IMPACT
  var droughtImpact = []
  var droughtImpactMask = []
  if (annualDroughtArray[0] === -9999) {
    droughtImpact.push(outputNoDataValue32bit)
    droughtImpactMask.push(0)
  } else if (annualDroughtArray[0] < -1) {
    droughtImpact.push(lintAnomaly[lintIndex])
    droughtImpactMask.push(1)
  } else {
    droughtImpact.push(outputNoDataValue32bit)
    droughtImpactMask.push(0)
  }

  // Compute ANNUAL DROUGHT IMPACT INTENSITY
  var droughtImpactIntensity = []
  var droughtImpactIntensityMask = []
  if (annualDroughtArray[0] === -9999 || lintAnomaly[lintIndex] === -9999) {
    droughtImpactIntensity.push(outputNoDataValue32bit)
    droughtImpactIntensityMask.push(0)
  } else if (annualDroughtArray[0] < -1 && lintAnomaly[lintIndex] < -0.5) {
    droughtImpactIntensity.push(lintAnomaly[lintIndex])
    droughtImpactIntensityMask.push(1)
  } else {
    droughtImpactIntensity.push(outputNoDataValue32bit)
    droughtImpactIntensityMask.push(0)
  }

  // Make sure there ar no undefined values
  var asm = noUndefined(annualSoilMoistureArray, outputNoDataValue32bit)
  var adp = noUndefined(annualDroughtArray, outputNoDataValue32bit)
  var adpi = noUndefined(annualDroughtPressureIntensity, outputNoDataValue32bit)
  var dpm = noUndefined(annualDroughtMonth, outputNoDataValue8bit)
  var adii = noUndefined(droughtImpactIntensity, outputNoDataValue32bit)
  var di = noUndefined(droughtImpact, outputNoDataValue32bit)
  var adiim = noUndefined(droughtImpactIntensityMask, outputNoDataValue32bit)
  var dim = noUndefined(droughtImpactMask, outputNoDataValue32bit)

  // Build an object witht the data needed for the yearly statistics
  var extractionData = {
    Annual_Soil_Moisture: asm[0],
    Annual_Drought_Pressure: adp[0],
    Annual_Drought_Pressure_Intensity: adpi[0],
    Drought_Pressure_Month: dpm[0],
    Drought_Impact: di[0],
    Drought_Impact_Intensity: adii[0]
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

  // Update Yearly Statistics
  if (
    Number.isInteger(NUTS) &&
    Number.isInteger(CLCA) &&
    Number.isInteger(LCF)
  ) {
    YearlyMRVPPStats = updateYearlyStatistics(
      YearlyMRVPPStats,
      YEAR1,
      NUTS,
      CLCA,
      LCF,
      extractionData
    )
  }

  // Get statistics for the Monthly
  var yearArray = [YEAR0, YEAR1]
  var counter = 0
  for (let iYear = 0; iYear < yearArray.length; iYear++) {
    for (let iMonth = 0; iMonth < 12; iMonth++) {
      if (monthlyDroughtArray[counter] !== outputNoDataValue32bit) {
        if (
          Number.isInteger(NUTS) &&
          Number.isInteger(CLCA) &&
          Number.isInteger(LCF)
        ) {
          MonthlyMRVPPStats = updateMonthlyStatistics(
            MonthlyMRVPPStats,
            yearArray[iYear],
            iMonth,
            NUTS,
            CLCA,
            LCF,
            monthlyDroughtArray[counter]
          )
        }
      }
      counter++
    }
  }

  return {
    Annual_Soil_Moisture_YEAR1: [asm],
    Annual_Drought_Pressure_YEAR1: [adp],
    Annual_Drought_Pressure_Intensity_YEAR1: [adpi],
    LINT_anomaly_YEAR1: [lintAnomaly[lintIndex]],
    Drought_Impact_YEAR1: [di],
    Drought_Impact_Mask_YEAR1: [dim],
    Drought_Impact_Intensity_YEAR1: [adii],
    Drought_Impact_Intensity_Mask_YEAR1: [adiim],
    Drought_Pressure_Month_YEAR1: [dpm],
    Monthly_Drought_Hazard_YEAR0_1: [monthlyDroughtArray[0]],
    Monthly_Drought_Hazard_YEAR0_2: [monthlyDroughtArray[1]],
    Monthly_Drought_Hazard_YEAR0_3: [monthlyDroughtArray[2]],
    Monthly_Drought_Hazard_YEAR0_4: [monthlyDroughtArray[3]],
    Monthly_Drought_Hazard_YEAR0_5: [monthlyDroughtArray[4]],
    Monthly_Drought_Hazard_YEAR0_6: [monthlyDroughtArray[5]],
    Monthly_Drought_Hazard_YEAR0_7: [monthlyDroughtArray[6]],
    Monthly_Drought_Hazard_YEAR0_8: [monthlyDroughtArray[7]],
    Monthly_Drought_Hazard_YEAR0_9: [monthlyDroughtArray[8]],
    Monthly_Drought_Hazard_YEAR0_10: [monthlyDroughtArray[9]],
    Monthly_Drought_Hazard_YEAR0_11: [monthlyDroughtArray[10]],
    Monthly_Drought_Hazard_YEAR0_12: [monthlyDroughtArray[11]],
    Monthly_Drought_Hazard_YEAR1_1: [monthlyDroughtArray[12]],
    Monthly_Drought_Hazard_YEAR1_2: [monthlyDroughtArray[13]],
    Monthly_Drought_Hazard_YEAR1_3: [monthlyDroughtArray[14]],
    Monthly_Drought_Hazard_YEAR1_4: [monthlyDroughtArray[15]],
    Monthly_Drought_Hazard_YEAR1_5: [monthlyDroughtArray[16]],
    Monthly_Drought_Hazard_YEAR1_6: [monthlyDroughtArray[17]],
    Monthly_Drought_Hazard_YEAR1_7: [monthlyDroughtArray[18]],
    Monthly_Drought_Hazard_YEAR1_8: [monthlyDroughtArray[19]],
    Monthly_Drought_Hazard_YEAR1_9: [monthlyDroughtArray[20]],
    Monthly_Drought_Hazard_YEAR1_10: [monthlyDroughtArray[21]],
    Monthly_Drought_Hazard_YEAR1_11: [monthlyDroughtArray[22]],
    Monthly_Drought_Hazard_YEAR1_12: [monthlyDroughtArray[23]]
  }
}
