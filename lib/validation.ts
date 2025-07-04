import { z } from 'zod';
import { envSchema } from './schemas';

/**
 * Validates data against a Zod schema and returns a structured result
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown):
    | { success: true; data: T }
    | { success: false; errors: z.ZodError } {
    try {
        const validatedData = schema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, errors: error };
        }
        throw error;
    }
}

/**
 * Validates data against a Zod schema and throws if invalid
 */
export function validateDataOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}

/**
 * Creates a validation error response for API endpoints
 */
export function createValidationErrorResponse(zodError: z.ZodError): Response {
    const errorDetails = zodError.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
    }));

    return new Response(
        JSON.stringify({
            error: 'Validation Error',
            message: 'Invalid request data',
            details: errorDetails,
            statusCode: 400,
        }),
        {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

/**
 * Validates environment variables and throws if invalid
 */
export function validateEnv() {
    // Environment variables validated via envSchema

    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Environment validation failed:');
            error.errors.forEach(err => {
                console.error(`   ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        throw error;
    }
}

/**
 * Safe JSON parsing with validation
 */
export function parseAndValidateJSON<T>(
    schema: z.ZodSchema<T>,
    text: string
): T | null {
    try {
        const json = JSON.parse(text);
        return validateDataOrThrow(schema, json);
    } catch (error) {
        console.error('JSON parsing or validation failed:', error);
        return null;
    }
} 