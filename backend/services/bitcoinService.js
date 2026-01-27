/**
 * Bitcoin Network Service
 * Hearst Mining Architect
 * 
 * Fetches live Bitcoin network data (price, difficulty, etc.)
 * Includes circuit breaker pattern for external API resilience
 */

const logger = require('../utils/logger');

// Cache for API responses
const cache = {
  price: { value: null, timestamp: 0 },
  difficulty: { value: null, timestamp: 0 },
  networkStats: { value: null, timestamp: 0 }
};

const CACHE_TTL = 60 * 1000; // 1 minute cache
const MAX_CACHE_SIZE = 100; // Maximum cache entries to prevent memory leak

// Circuit breaker state
const circuitBreaker = {
  coingecko: { failures: 0, lastFailure: 0, isOpen: false },
  blockchain: { failures: 0, lastFailure: 0, isOpen: false },
  mempool: { failures: 0, lastFailure: 0, isOpen: false }
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before opening circuit
const CIRCUIT_BREAKER_RESET_MS = 60 * 1000; // 1 minute reset

/**
 * Check if circuit is open for a service
 */
const isCircuitOpen = (service) => {
  const circuit = circuitBreaker[service];
  if (!circuit) return false;
  
  if (circuit.isOpen) {
    // Check if enough time has passed to try again
    if (Date.now() - circuit.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
      circuit.isOpen = false;
      circuit.failures = 0;
      logger.info(`Circuit breaker reset for ${service}`);
      return false;
    }
    return true;
  }
  return false;
};

/**
 * Record a failure for circuit breaker
 */
const recordFailure = (service) => {
  const circuit = circuitBreaker[service];
  if (!circuit) return;
  
  circuit.failures++;
  circuit.lastFailure = Date.now();
  
  if (circuit.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuit.isOpen = true;
    logger.warn(`Circuit breaker opened for ${service} after ${circuit.failures} failures`);
  }
};

/**
 * Record a success for circuit breaker
 */
const recordSuccess = (service) => {
  const circuit = circuitBreaker[service];
  if (circuit) {
    circuit.failures = 0;
    circuit.isOpen = false;
  }
};

/**
 * Fetch with timeout and error handling
 */
const fetchWithTimeout = async (url, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Get current BTC price in USD
 */
const getBTCPrice = async () => {
  try {
    // Check cache first
    if (cache.price.value && Date.now() - cache.price.timestamp < CACHE_TTL) {
      return cache.price.value;
    }

    // Check circuit breaker
    if (isCircuitOpen('coingecko')) {
      logger.debug('Circuit open for CoinGecko, using cached price');
      if (cache.price.value) {
        return cache.price.value;
      }
      // Use fallback only if no cached value
      logger.warn('No cached price available, using fallback');
      return 95000;
    }

    // Try CoinGecko API (free, no auth required)
    const data = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
    );

    const price = data.bitcoin?.usd || 0;
    
    if (price <= 0) {
      throw new Error('Invalid price received from API');
    }
    
    // Update cache
    cache.price = { value: price, timestamp: Date.now() };
    
    // Record success
    recordSuccess('coingecko');
    
    logger.debug('BTC price fetched', { price });
    return price;
  } catch (error) {
    logger.error('Error fetching BTC price', { error: error.message });
    recordFailure('coingecko');
    
    // Return cached value if available and not too old (10 minutes)
    if (cache.price.value && Date.now() - cache.price.timestamp < CACHE_TTL * 10) {
      logger.info('Using cached BTC price', { age: Date.now() - cache.price.timestamp });
      return cache.price.value;
    }
    
    // Last resort fallback
    logger.warn('Using fallback BTC price');
    return 95000;
  }
};

/**
 * Get current network difficulty
 */
const getNetworkDifficulty = async () => {
  try {
    // Check cache (difficulty changes slowly, cache for 10 minutes)
    if (cache.difficulty.value && Date.now() - cache.difficulty.timestamp < CACHE_TTL * 10) {
      return cache.difficulty.value;
    }

    // Check circuit breaker
    if (isCircuitOpen('blockchain')) {
      logger.debug('Circuit open for blockchain.info, using cached difficulty');
      if (cache.difficulty.value) {
        return cache.difficulty.value;
      }
      return 110e12; // Fallback
    }

    // Try blockchain.info API
    const data = await fetchWithTimeout(
      'https://blockchain.info/q/getdifficulty'
    );

    const difficulty = typeof data === 'number' ? data : parseFloat(data);
    
    if (isNaN(difficulty) || difficulty <= 0) {
      throw new Error('Invalid difficulty received from API');
    }
    
    // Update cache
    cache.difficulty = { value: difficulty, timestamp: Date.now() };
    
    // Record success
    recordSuccess('blockchain');
    
    logger.debug('Network difficulty fetched', { difficulty: difficulty.toExponential(2) });
    return difficulty;
  } catch (error) {
    logger.error('Error fetching difficulty', { error: error.message });
    recordFailure('blockchain');
    
    // Return cached or fallback (approximate Jan 2026 difficulty)
    if (cache.difficulty.value) {
      return cache.difficulty.value;
    }
    return 110e12;
  }
};

/**
 * Get network hashrate estimate
 */
const getNetworkHashrate = async () => {
  try {
    const difficulty = await getNetworkDifficulty();
    // Estimate: difficulty * 2^32 / 600 seconds
    const hashrate = (difficulty * Math.pow(2, 32)) / 600;
    return hashrate;
  } catch (error) {
    logger.error('Error calculating network hashrate', { error: error.message });
    return 650e18; // Fallback ~650 EH/s
  }
};

/**
 * Get comprehensive network stats
 */
const getNetworkStats = async () => {
  try {
    // Check cache
    if (cache.networkStats.value && Date.now() - cache.networkStats.timestamp < CACHE_TTL) {
      return cache.networkStats.value;
    }

    const [price, difficulty] = await Promise.all([
      getBTCPrice(),
      getNetworkDifficulty()
    ]);

    const networkHashrate = (difficulty * Math.pow(2, 32)) / 600;

    const stats = {
      price: {
        usd: price,
        formattedUSD: `$${price.toLocaleString()}`
      },
      difficulty: {
        raw: difficulty,
        formatted: `${(difficulty / 1e12).toFixed(2)}T`
      },
      hashrate: {
        raw: networkHashrate,
        formatted: `${(networkHashrate / 1e18).toFixed(2)} EH/s`
      },
      blockReward: 3.125,
      blocksPerDay: 144,
      halvingEpoch: 5,
      nextHalvingBlock: 1050000,
      fetchedAt: new Date().toISOString()
    };

    // Update cache
    cache.networkStats = { value: stats, timestamp: Date.now() };

    return stats;
  } catch (error) {
    logger.error('Error fetching network stats', { error: error.message });
    
    // Return cached or fallback
    return cache.networkStats.value || {
      price: { usd: 95000, formattedUSD: '$95,000' },
      difficulty: { raw: 110e12, formatted: '110.00T' },
      hashrate: { raw: 650e18, formatted: '650.00 EH/s' },
      blockReward: 3.125,
      blocksPerDay: 144,
      fetchedAt: new Date().toISOString(),
      cached: true
    };
  }
};

/**
 * Get mempool stats (fees)
 */
const getMempoolStats = async () => {
  try {
    // Try mempool.space API
    const data = await fetchWithTimeout(
      'https://mempool.space/api/v1/fees/recommended'
    );

    return {
      fastestFee: data.fastestFee,
      halfHourFee: data.halfHourFee,
      hourFee: data.hourFee,
      economyFee: data.economyFee,
      minimumFee: data.minimumFee,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error fetching mempool stats', { error: error.message });
    return null;
  }
};

/**
 * Calculate mining profitability with live data
 */
const getLiveProfitability = async (hashrateTH, powerWatts, electricityRate) => {
  const { calculateProfitability } = require('../utils/miningCalculator');
  
  const [price, difficulty] = await Promise.all([
    getBTCPrice(),
    getNetworkDifficulty()
  ]);

  return calculateProfitability({
    hashrateTH,
    powerWatts,
    electricityRate,
    networkDifficulty: difficulty,
    btcPrice: price
  });
};

module.exports = {
  getBTCPrice,
  getNetworkDifficulty,
  getNetworkHashrate,
  getNetworkStats,
  getMempoolStats,
  getLiveProfitability
};
