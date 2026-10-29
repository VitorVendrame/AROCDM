import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Linking,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, GRADIENTS } from '../src/constants/theme';
import { useObjectDetection } from '../src/hooks/useObjectDetection';
import LoadingScreen from '../src/components/LoadingScreen';
import ErrorScreen from '../src/components/ErrorScreen';
import DetectionOverlay from '../src/components/DetectionOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [cameraReady, setCameraReady] = useState(false);

  const { cameraRef, state, initModel, startDetection, stopDetection } =
    useObjectDetection();

  // Init model on mount
  useEffect(() => {
    initModel();
  }, [initModel]);

  // Start detection when camera + model are ready
  useEffect(() => {
    if (cameraReady && state?.status === 'ready' && Platform.OS !== 'web') {
      startDetection();
      return () => stopDetection();
    }
  }, [cameraReady, state?.status, startDetection, stopDetection]);

  const handleFlipCamera = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light)?.catch?.(() => {});
    }
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const handleRetryPermission = useCallback(() => {
    requestPermission?.();
  }, [requestPermission]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings?.()?.catch?.(() => {});
  }, []);

  const handleRetryModel = useCallback(() => {
    initModel();
  }, [initModel]);

  // Loading state
  if (state?.status === 'loading') {
    return <LoadingScreen statusText={state?.statusText ?? 'Carregando...'} />;
  }

  // Model error
  if (state?.status === 'error' && !permission?.granted) {
    return <ErrorScreen type="model" onRetry={handleRetryModel} />;
  }

  // Permission not yet determined
  if (!permission?.granted) {
    if (permission?.canAskAgain === false) {
      return (
        <ErrorScreen
          type="camera"
          onRetry={handleRetryPermission}
          onOpenSettings={handleOpenSettings}
        />
      );
    }
    // Ask for permission
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera" size={64} color={COLORS.primary} />
        <Text style={styles.permTitle}>Detector de Objetos</Text>
        <Text style={styles.permBody}>
          Precisamos de acesso à câmera para detectar objetos em tempo real.
        </Text>
        <Pressable
          onPress={handleRetryPermission}
          style={({ pressed }) => [styles.permButtonWrap, pressed && { opacity: 0.8 }]}
          accessibilityLabel="Permitir acesso à câmera"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={GRADIENTS.primaryToAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.permButton}
          >
            <Text style={styles.permButtonText}>Permitir Câmera</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  // Model error after permission granted
  if (state?.status === 'error') {
    return <ErrorScreen type="model" onRetry={handleRetryModel} />;
  }

  const detections = state?.detections ?? [];
  const detCount = detections?.length ?? 0;
  const statusColor =
    state?.status === 'detecting'
      ? COLORS.warning
      : state?.status === 'ready'
        ? COLORS.success
        : COLORS.error;
  const statusLabel =
    state?.status === 'detecting'
      ? 'Processando'
      : state?.status === 'ready'
        ? 'Ativo'
        : 'Erro';

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Detection overlays */}
      <DetectionOverlay
        detections={detections}
        cameraWidth={SCREEN_WIDTH}
        cameraHeight={SCREEN_HEIGHT}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>Detector</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Detection count */}
        <View style={styles.bottomLeft}>
          <Text style={styles.countText}>
            {detCount} {detCount === 1 ? 'objeto' : 'objetos'}
          </Text>
        </View>

        {/* Flip button */}
        <Pressable
          onPress={handleFlipCamera}
          style={({ pressed }) => [
            styles.flipButtonOuter,
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          accessibilityLabel="Alternar entre câmera frontal e traseira"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={GRADIENTS.primaryToAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.flipGradient}
          >
            <View style={styles.flipInner}>
              <MaterialCommunityIcons
                name="camera-flip-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
          </LinearGradient>
          <Text style={styles.flipLabel}>Alternar Câmera</Text>
        </Pressable>

        {/* Inference time */}
        <View style={styles.bottomRight}>
          <Text style={styles.fpsText}>
            ~{(state?.inferenceTime ?? 0)?.toFixed?.(1) ?? '0.0'}s
          </Text>
        </View>
      </View>

      {/* Web fallback message */}
      {Platform.OS === 'web' && (
        <View style={styles.webBanner}>
          <MaterialCommunityIcons name="information" size={18} color={COLORS.warning} />
          <Text style={styles.webBannerText}>
            A detecção de objetos funciona apenas no aplicativo instalado no dispositivo.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: COLORS.glassBg,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: COLORS.glassBg,
  },
  bottomLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  bottomRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  countText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  fpsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Flip button
  flipButtonOuter: {
    alignItems: 'center',
  },
  flipGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  flipInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Permission screen
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  permBody: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  permButtonWrap: {
    marginTop: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  permButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Web banner
  webBanner: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,10,10,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: 340,
  },
  webBannerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
