#!/usr/bin/env tsx

import { config } from 'dotenv';

// Load environment variables
config();

interface EnvValidation {
    name: string;
    value: string | undefined;
    required: boolean;
    valid: boolean;
    message: string;
}

const validations: EnvValidation[] = [
    {
        name: 'SOCKET_PORT',
        value: process.env.SOCKET_PORT,
        required: false,
        valid: true,
        message: 'Socket.IO server port (default: 3001)'
    },
    {
        name: 'EXPO_PUBLIC_SOCKET_URL',
        value: process.env.EXPO_PUBLIC_SOCKET_URL,
        required: true,
        valid: !!process.env.EXPO_PUBLIC_SOCKET_URL,
        message: 'Socket.IO server URL for client connection'
    },
    {
        name: 'EXPO_PUBLIC_CLIENT_URL',
        value: process.env.EXPO_PUBLIC_CLIENT_URL,
        required: false,
        valid: true,
        message: 'Client URL for CORS configuration (default: http://localhost:8081)'
    },
    {
        name: 'NODE_ENV',
        value: process.env.NODE_ENV,
        required: false,
        valid: true,
        message: 'Node environment (default: development)'
    },
    {
        name: 'LOG_LEVEL',
        value: process.env.LOG_LEVEL,
        required: false,
        valid: true,
        message: 'Logging level (default: info)'
    },
    {
        name: 'BETTER_AUTH_SECRET',
        value: process.env.BETTER_AUTH_SECRET,
        required: true,
        valid: !!process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32,
        message: 'Better Auth secret (minimum 32 characters)'
    }
];

console.log('🔍 Validating Socket.IO Server Environment Variables\n');

let allValid = true;

validations.forEach(validation => {
    const status = validation.valid ? '✅' : '❌';
    const required = validation.required ? '(REQUIRED)' : '(OPTIONAL)';
    const value = validation.value || 'NOT SET';

    console.log(`${status} ${validation.name} ${required}`);
    console.log(`   Value: ${value}`);
    console.log(`   Description: ${validation.message}`);
    console.log('');

    if (!validation.valid) {
        allValid = false;
    }
});

if (allValid) {
    console.log('🎉 All environment variables are valid!');
    process.exit(0);
} else {
    console.log('⚠️  Some environment variables are missing or invalid.');
    console.log('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
} 