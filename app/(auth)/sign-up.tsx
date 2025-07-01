import { useAuth } from '@/components/AuthProvider';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function SignUpScreen() {
    const { signUp } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();

    const handleSignUp = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Fill in name, e-mail, and password');
            return;
        }
        setLoading(true);
        try {
            await signUp(email.trim(), password, name.trim());
            // Navigate to the app root (tab layout) after successful sign-up.
            router.replace('/');
        } catch (err: any) {
            Alert.alert('Sign-up failed', err.message ?? 'Unable to sign up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>Sign Up</ThemedText>

            <TextInput
                placeholder="Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor={colorScheme === 'dark' ? '#aaa' : '#666'}
                style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#fff', color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            />
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
            <Button title={loading ? 'Signing up…' : 'Sign Up'} onPress={handleSignUp} disabled={loading} />

            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')} style={{ marginTop: 16 }}>
                <ThemedText style={{ color: '#0a7ea4', textAlign: 'center' }}>Already have an account? Sign in</ThemedText>
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
