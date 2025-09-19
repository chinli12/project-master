import { AlertOptions } from '../components/ModernAlert';

// Global reference to the alert function - will be set by the provider
let globalShowAlert: ((options: AlertOptions) => void) | null = null;

export const setGlobalAlertFunction = (showAlert: (options: AlertOptions) => void) => {
  globalShowAlert = showAlert;
};

// Modern replacements for Alert.alert
export const ModernAlert = {
  alert: (title: string, message?: string, buttons?: Array<{text?: string, onPress?: () => void, style?: string}>) => {
    if (!globalShowAlert) {
      console.warn('ModernAlert not initialized. Make sure AlertProvider is wrapped around your app.');
      return;
    }

    // Handle different button configurations
    if (!buttons || buttons.length === 0) {
      // Simple alert with just OK button
      globalShowAlert({
        title,
        message,
        type: 'info',
      });
    } else if (buttons.length === 1) {
      // Single button alert
      const button = buttons[0];
      globalShowAlert({
        title,
        message,
        type: button.style === 'destructive' ? 'error' : 'info',
        onConfirm: button.onPress,
      });
    } else if (buttons.length === 2) {
      // Two button alert (typically Cancel + Confirm)
      const cancelButton = buttons.find(b => b.style === 'cancel') || buttons[0];
      const confirmButton = buttons.find(b => b.style !== 'cancel') || buttons[1];
      
      globalShowAlert({
        title,
        message,
        type: 'confirm',
        cancelText: cancelButton.text || 'Cancel',
        confirmText: confirmButton.text || 'OK',
        onCancel: cancelButton.onPress,
        onConfirm: confirmButton.onPress,
      });
    }
  },

  // Convenience methods for different alert types
  success: (title: string, message?: string, onConfirm?: () => void) => {
    if (!globalShowAlert) return;
    globalShowAlert({
      title,
      message,
      type: 'success',
      onConfirm,
    });
  },

  error: (title: string, message?: string, onConfirm?: () => void) => {
    if (!globalShowAlert) return;
    globalShowAlert({
      title,
      message,
      type: 'error',
      onConfirm,
      duration: 5000, // Longer duration for errors
    });
  },

  warning: (title: string, message?: string, onConfirm?: () => void) => {
    if (!globalShowAlert) return;
    globalShowAlert({
      title,
      message,
      type: 'warning',
      onConfirm,
    });
  },

  info: (title: string, message?: string, onConfirm?: () => void) => {
    if (!globalShowAlert) return;
    globalShowAlert({
      title,
      message,
      type: 'info',
      onConfirm,
    });
  },

  confirm: (
    title: string, 
    message?: string, 
    onConfirm?: () => void, 
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    if (!globalShowAlert) return;
    globalShowAlert({
      title,
      message,
      type: 'confirm',
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      persistent: true,
    });
  },
};

// Helper function to convert Alert.alert calls to modern alerts
export const convertAlertCall = (title: string, message?: string) => {
  // Determine alert type based on title/message content
  const titleLower = title.toLowerCase();
  const messageLower = message?.toLowerCase() || '';
  
  if (titleLower.includes('success') || titleLower.includes('created') || titleLower.includes('saved')) {
    return ModernAlert.success(title, message);
  }
  
  if (titleLower.includes('error') || titleLower.includes('failed') || titleLower.includes('fail')) {
    return ModernAlert.error(title, message);
  }
  
  if (titleLower.includes('warning') || titleLower.includes('permission')) {
    return ModernAlert.warning(title, message);
  }
  
  // Default to info
  return ModernAlert.info(title, message);
};
