/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react-native' {
  import React from 'react';

  export const View: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const TouchableOpacity: React.ComponentType<any>;
  export const ScrollView: React.ComponentType<any>;
  export const SafeAreaView: React.ComponentType<any>;
  export const StatusBar: React.ComponentType<any> & {
    setBarStyle?: (style: string) => void;
    setBackgroundColor?: (color: string) => void;
  };
  export const Modal: React.ComponentType<any>;
  export const ActivityIndicator: React.ComponentType<any>;
  export const Pressable: React.ComponentType<any>;
  export const FlatList: React.ComponentType<any>;

  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
    compose: (a: any, b: any) => any;
    flatten: (a: any) => any;
  };

  export const Share: {
    share: (content: { title?: string; message: string; url?: string }) => Promise<any>;
  };

  export const Platform: {
    OS: 'ios' | 'android' | 'web';
    select: <T>(obj: { ios?: T; android?: T; web?: T; default?: T }) => T;
  };

  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number };
  };

  export const Vibration: {
    vibrate: (pattern?: number | number[]) => void;
    cancel: () => void;
  };
}
