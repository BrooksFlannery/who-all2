import { useAuth } from '@/components/AuthProvider';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function SignInScreen() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();

    const handleSignIn = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Enter e-mail and password');
            return;
        }
        setLoading(true);
        try {
            await signIn(email.trim(), password);
            // Navigate to the app root (tab layout) after successful sign-in.
            router.replace('/');
        } catch (err: any) {
            Alert.alert('Sign-in failed', err.message ?? 'Unable to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>Sign In</ThemedText>

            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={colorScheme === 'dark' ? '#aaa' : '#666'}
                style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#fff', color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            />

            <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor={colorScheme === 'dark' ? '#aaa' : '#666'}
                style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#fff', color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            />

            <Button title={loading ? 'Signing in…' : 'Sign In'} onPress={handleSignIn} disabled={loading} />

            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-up')} style={{ marginTop: 16 }}>
                <ThemedText style={{ color: '#0a7ea4', textAlign: 'center' }}>New here? Sign up</ThemedText>
            </TouchableOpacity>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        gap: 12,
    },
    title: {
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#555',
        borderRadius: 8,
        padding: 12,
    },
});
