/**
 * Bitcoin Mining Calculator Utilities
 * Hearst Mining Architect
 * 
 * Core calculations for mining profitability, power consumption, and ROI
 */

// Constants
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_MONTH = SECONDS_PER_DAY * 30;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;
const BLOCK_REWARD = 3.125; // Post-2024 halving
const BLOCKS_PER_DAY = 144;

/**
 * Calculate daily BTC revenue based on hashrate and network difficulty
 * @param {number} hashrateTH - Hashrate in TH/s
 * @param {number} networkDifficulty - Current network difficulty
 * @returns {number} Daily BTC revenue
 */
const calculateDailyBTC = (hashrateTH, networkDifficulty) => {
  // Convert TH/s to H/s
  const hashrateH = hashrateTH * 1e12;
  
  // Network hashrate estimation from difficulty
  // difficulty * 2^32 / time_between_blocks = network_hashrate
  const networkHashrate = (networkDifficulty * Math.pow(2, 32)) / 600;
  
  // Your share of network hashrate
  const shareOfNetwork = hashrateH / networkHashrate;
  
  // Daily BTC = blocks_per_day * block_reward * your_share
  const dailyBTC = BLOCKS_PER_DAY * BLOCK_REWARD * shareOfNetwork;
  
  return dailyBTC;
};

/**
 * Calculate power consumption and costs
 * @param {number} powerWatts - Power consumption in watts
 * @param {number} electricityRate - Cost per kWh in USD
 * @param {string} period - 'daily', 'monthly', 'yearly'
 * @returns {Object} Power costs breakdown
 */
const calculatePowerCosts = (powerWatts, electricityRate, period = 'daily') => {
  const hoursPerPeriod = {
    daily: 24,
    monthly: 24 * 30,
    yearly: 24 * 365
  };
  
  const hours = hoursPerPeriod[period] || 24;
  const kWh = (powerWatts / 1000) * hours;
  const cost = kWh * electricityRate;
  
  return {
    kWh: Math.round(kWh * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    period
  };
};

/**
 * Calculate mining profitability
 * @param {Object} params - Calculation parameters
 * @returns {Object} Profitability analysis
 */
const calculateProfitability = ({
  hashrateTH,
  powerWatts,
  electricityRate,
  networkDifficulty,
  btcPrice,
  poolFeePercent = 2,
  machineCost = 0
}) => {
  // Daily BTC revenue
  const dailyBTC = calculateDailyBTC(hashrateTH, networkDifficulty);
  
  // Apply pool fee
  const dailyBTCAfterFee = dailyBTC * (1 - poolFeePercent / 100);
  
  // Revenue in USD
  const dailyRevenueUSD = dailyBTCAfterFee * btcPrice;
  const monthlyRevenueUSD = dailyRevenueUSD * 30;
  const yearlyRevenueUSD = dailyRevenueUSD * 365;
  
  // Power costs
  const dailyPowerCost = calculatePowerCosts(powerWatts, electricityRate, 'daily').cost;
  const monthlyPowerCost = calculatePowerCosts(powerWatts, electricityRate, 'monthly').cost;
  const yearlyPowerCost = calculatePowerCosts(powerWatts, electricityRate, 'yearly').cost;
  
  // Profit
  const dailyProfit = dailyRevenueUSD - dailyPowerCost;
  const monthlyProfit = monthlyRevenueUSD - monthlyPowerCost;
  const yearlyProfit = yearlyRevenueUSD - yearlyPowerCost;
  
  // ROI calculation
  const daysToROI = machineCost > 0 ? Math.ceil(machineCost / dailyProfit) : 0;
  const roiMonths = machineCost > 0 ? Math.round((machineCost / monthlyProfit) * 10) / 10 : 0;
  
  // Efficiency metrics
  const efficiencyJPerTH = powerWatts / hashrateTH;
  const revenuePerTH = dailyRevenueUSD / hashrateTH;
  
  return {
    btc: {
      daily: Math.round(dailyBTCAfterFee * 1e8) / 1e8,
      monthly: Math.round(dailyBTCAfterFee * 30 * 1e8) / 1e8,
      yearly: Math.round(dailyBTCAfterFee * 365 * 1e8) / 1e8
    },
    revenue: {
      daily: Math.round(dailyRevenueUSD * 100) / 100,
      monthly: Math.round(monthlyRevenueUSD * 100) / 100,
      yearly: Math.round(yearlyRevenueUSD * 100) / 100
    },
    powerCost: {
      daily: dailyPowerCost,
      monthly: monthlyPowerCost,
      yearly: yearlyPowerCost
    },
    profit: {
      daily: Math.round(dailyProfit * 100) / 100,
      monthly: Math.round(monthlyProfit * 100) / 100,
      yearly: Math.round(yearlyProfit * 100) / 100
    },
    roi: {
      daysToBreakeven: daysToROI > 0 ? daysToROI : null,
      monthsToBreakeven: roiMonths > 0 ? roiMonths : null,
      annualROIPercent: machineCost > 0 
        ? Math.round((yearlyProfit / machineCost) * 10000) / 100 
        : null
    },
    efficiency: {
      joulesPerTH: Math.round(efficiencyJPerTH * 10) / 10,
      revenuePerTH: Math.round(revenuePerTH * 100) / 100
    },
    inputs: {
      hashrateTH,
      powerWatts,
      electricityRate,
      networkDifficulty,
      btcPrice,
      poolFeePercent,
      machineCost
    }
  };
};

/**
 * Calculate farm-wide metrics
 * @param {Array} machines - Array of machine objects
 * @param {Object} params - Farm parameters
 * @returns {Object} Farm-wide analysis
 */
const calculateFarmMetrics = (machines, { electricityRate, networkDifficulty, btcPrice }) => {
  if (!machines || machines.length === 0) {
    return {
      totalHashrate: 0,
      totalPower: 0,
      machineCount: 0,
      profitability: null
    };
  }
  
  // Aggregate metrics
  const totalHashrate = machines.reduce((sum, m) => sum + (m.hashrateTH || 0), 0);
  const totalPower = machines.reduce((sum, m) => sum + (m.powerWatts || 0), 0);
  const totalCost = machines.reduce((sum, m) => sum + (m.cost || 0), 0);
  const activeCount = machines.filter(m => m.status === 'active' || m.status === 'online').length;
  
  // Calculate profitability for entire farm
  const profitability = calculateProfitability({
    hashrateTH: totalHashrate,
    powerWatts: totalPower,
    electricityRate,
    networkDifficulty,
    btcPrice,
    machineCost: totalCost
  });
  
  return {
    totalHashrate: Math.round(totalHashrate * 100) / 100,
    totalPower,
    totalPowerMW: Math.round((totalPower / 1000000) * 1000) / 1000,
    machineCount: machines.length,
    activeMachines: activeCount,
    uptime: machines.length > 0 ? Math.round((activeCount / machines.length) * 100) : 0,
    averageEfficiency: totalHashrate > 0 
      ? Math.round((totalPower / totalHashrate) * 10) / 10 
      : 0,
    totalInvestment: totalCost,
    profitability
  };
};

/**
 * Calculate cooling requirements
 * @param {number} totalPowerWatts - Total power consumption
 * @param {number} pueRatio - Power Usage Effectiveness (default 1.2)
 * @returns {Object} Cooling analysis
 */
const calculateCoolingRequirements = (totalPowerWatts, pueRatio = 1.2) => {
  // Heat generated = power consumed (nearly 100% for ASICs)
  const heatGeneratedWatts = totalPowerWatts;
  
  // BTU calculation (1 watt = 3.412 BTU/hr)
  const btuPerHour = heatGeneratedWatts * 3.412;
  
  // Tons of cooling (1 ton = 12,000 BTU/hr)
  const tonsOfCooling = btuPerHour / 12000;
  
  // Total power including cooling overhead
  const totalPowerWithCooling = totalPowerWatts * pueRatio;
  const coolingPower = totalPowerWithCooling - totalPowerWatts;
  
  return {
    heatGeneratedKW: Math.round(heatGeneratedWatts / 1000),
    btuPerHour: Math.round(btuPerHour),
    tonsOfCooling: Math.round(tonsOfCooling * 10) / 10,
    coolingPowerKW: Math.round(coolingPower / 1000),
    totalPowerWithCoolingKW: Math.round(totalPowerWithCooling / 1000),
    pueRatio
  };
};

/**
 * Calculate electrical infrastructure requirements
 * @param {number} totalPowerWatts - Total power consumption
 * @param {number} voltage - Voltage (default 480V for industrial)
 * @param {number} powerFactor - Power factor (default 0.95)
 * @returns {Object} Electrical requirements
 */
const calculateElectricalRequirements = (totalPowerWatts, voltage = 480, powerFactor = 0.95) => {
  // Apparent power (VA)
  const apparentPowerVA = totalPowerWatts / powerFactor;
  
  // Current per phase (3-phase)
  const currentPerPhase = apparentPowerVA / (Math.sqrt(3) * voltage);
  
  // Recommended breaker size (125% of continuous load)
  const breakerSize = currentPerPhase * 1.25;
  
  // Transformer sizing (20% headroom)
  const transformerKVA = (apparentPowerVA / 1000) * 1.2;
  
  return {
    totalPowerKW: Math.round(totalPowerWatts / 1000),
    apparentPowerKVA: Math.round(apparentPowerVA / 1000),
    currentPerPhaseAmps: Math.round(currentPerPhase),
    recommendedBreakerAmps: Math.ceil(breakerSize / 50) * 50, // Round up to nearest 50A
    transformerSizeKVA: Math.ceil(transformerKVA / 100) * 100, // Round up to nearest 100kVA
    voltage,
    powerFactor,
    phases: 3
  };
};

module.exports = {
  calculateDailyBTC,
  calculatePowerCosts,
  calculateProfitability,
  calculateFarmMetrics,
  calculateCoolingRequirements,
  calculateElectricalRequirements,
  BLOCK_REWARD,
  BLOCKS_PER_DAY
};
