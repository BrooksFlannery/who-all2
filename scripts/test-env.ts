import 'dotenv/config';

console.log('🔍 Environment Variables Test');
console.log('='.repeat(50));

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('GOOGLE_PLACES_API_KEY:', process.env.GOOGLE_PLACES_API_KEY ? '✅ Set' : '❌ Not set');

console.log('\n📋 All environment variables:');
Object.keys(process.env).forEach(key => {
    if (key.includes('DATABASE') || key.includes('OPENAI') || key.includes('GOOGLE') || key.includes('API')) {
        console.log(`  ${key}: ${process.env[key] ? 'Set' : 'Not set'}`);
    }
}); 