import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  MessageCircle,
} from 'lucide-react-native';
import { setGlobalAlertFunction } from '../utils/modernAlert';

const { width, height } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  duration?: number;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  persistent?: boolean;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertState {
  visible: boolean;
  options: AlertOptions;
}

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    options: { title: '', type: 'info' },
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register the global alert function
  useEffect(() => {
    setGlobalAlertFunction(showAlert);
  }, []);

  const showAlert = (options: AlertOptions) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setAlertState({ visible: true, options });
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide for non-persistent alerts
    if (!options.persistent && options.type !== 'confirm') {
      const duration = options.duration || (options.type === 'error' ? 4000 : 3000);
      timeoutRef.current = setTimeout(() => {
        hideAlert();
      }, duration);
    }
  };

  const hideAlert = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAlertState({ visible: false, options: { title: '', type: 'info' } });
    });
  };

  const handleConfirm = () => {
    alertState.options.onConfirm?.();
    hideAlert();
  };

  const handleCancel = () => {
    alertState.options.onCancel?.();
    hideAlert();
  };

  const getIconAndColors = (type: AlertType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: '#10B981',
          borderColor: '#10B981',
          bgColor: '#ECFDF5',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: '#EF4444',
          borderColor: '#EF4444',
          bgColor: '#FEF2F2',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: '#F59E0B',
          borderColor: '#F59E0B',
          bgColor: '#FFFBEB',
        };
      case 'confirm':
        return {
          icon: MessageCircle,
          iconColor: '#3B82F6',
          borderColor: '#3B82F6',
          bgColor: '#EFF6FF',
        };
      default:
        return {
          icon: Info,
          iconColor: '#3B82F6',
          borderColor: '#3B82F6',
          bgColor: '#EFF6FF',
        };
    }
  };

  const { icon: IconComponent, iconColor, borderColor, bgColor } = getIconAndColors(
    alertState.options.type || 'info'
  );

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal
        visible={alertState.visible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={alertState.options.type !== 'confirm' ? hideAlert : undefined}
            activeOpacity={1}
          />
          
          <Animated.View
            style={[
              styles.alertContainer,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={100} tint="light" style={styles.alertContent}>
                <AlertContent
                  options={alertState.options}
                  IconComponent={IconComponent}
                  iconColor={iconColor}
                  borderColor={borderColor}
                  bgColor={bgColor}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  onClose={hideAlert}
                />
              </BlurView>
            ) : (
              <View style={[styles.alertContent, styles.alertContentAndroid]}>
                <AlertContent
                  options={alertState.options}
                  IconComponent={IconComponent}
                  iconColor={iconColor}
                  borderColor={borderColor}
                  bgColor={bgColor}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  onClose={hideAlert}
                />
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
};

interface AlertContentProps {
  options: AlertOptions;
  IconComponent: any;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

const AlertContent: React.FC<AlertContentProps> = ({
  options,
  IconComponent,
  iconColor,
  borderColor,
  bgColor,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const isConfirm = options.type === 'confirm';
  
  return (
    <>
      {/* Close button for non-confirm alerts */}
      {!isConfirm && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <X size={20} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* Icon */}
      <View style={styles.iconContainer}>
        <View
          style={[styles.iconBackground, { backgroundColor: bgColor }]}
        >
          <IconComponent size={32} color={iconColor} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>
        {options.title}
      </Text>

      {/* Message */}
      {options.message && (
        <Text style={styles.message}>
          {options.message}
        </Text>
      )}

      {/* Buttons */}
      {isConfirm ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>
              {options.cancelText || 'Cancel'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton, { backgroundColor: iconColor }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>
              {options.confirmText || 'Confirm'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.singleButton, { backgroundColor: iconColor }]}
          onPress={onClose}
        >
          <Text style={styles.singleButtonText}>OK</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  alertContent: {
    padding: 24,
  },
  alertContentAndroid: {
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    // backgroundColor will be set dynamically
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  singleButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  singleButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
