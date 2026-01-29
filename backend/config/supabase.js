/**
 * Supabase Client Configuration
 * Hearst Mining Architect
 * 
 * ⚠️ RÈGLE ULTIME: TOUJOURS connecté à Supabase Live
 * JAMAIS de mode mock/offline
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// ============================================
// VÉRIFICATION OBLIGATOIRE - PAS DE MODE MOCK
// ============================================
if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ ERREUR CRITIQUE: Variables Supabase manquantes!');
  logger.error('   SUPABASE_URL et SUPABASE_ANON_KEY sont OBLIGATOIRES');
  logger.error('   Le mode mock est INTERDIT par règle ultime');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Test de connexion au démarrage
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('infrastructure_templates')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    logger.info('✅ Supabase connecté avec succès');
    logger.info(`   URL: ${supabaseUrl}`);
    return true;
  } catch (error) {
    logger.error('❌ Échec connexion Supabase:', error.message);
    logger.error('   Le backend NE PEUT PAS fonctionner sans Supabase');
    process.exit(1);
  }
}

module.exports = {
  supabase,
  testConnection
};
