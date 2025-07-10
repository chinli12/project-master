import React, { useState, useCallback, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  View,
  Modal,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  FlatList,
  Text,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

interface ImageCarouselProps {
  images: { id: string; image: string }[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function ImageCarousel({
  images,
  visible,
  initialIndex,
  onClose,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeAnim = useSharedValue(1);
  const flatListRef = React.useRef<FlatList>(null);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const toggleControls = useCallback(() => {
    setControlsVisible(prev => !prev);
    fadeAnim.value = withSpring(controlsVisible ? 0 : 1);
  }, [controlsVisible]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true
      });
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true
      });
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <SafeAreaView style={styles.content}>
          <Animated.View style={[styles.header, fadeStyle]}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.counter}>
              {currentIndex + 1} / {images.length}
            </Text>
          </Animated.View>

          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.imageContainer}>
                <ImageZoomView 
                  uri={item.image} 
                  onLoadStart={() => setLoadingStates(prev => ({ ...prev, [item.id]: true }))}
                  onLoadEnd={() => setLoadingStates(prev => ({ ...prev, [item.id]: false }))}
                  isLoading={loadingStates[item.id]}
                  onSingleTap={toggleControls}
                  fadeStyle={fadeStyle}
                />
              </View>
            )}
            keyExtractor={item => item.id}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentIndex(newIndex);
            }}
          />

          {currentIndex > 0 && (
            <Animated.View style={[fadeStyle]}>
              <TouchableOpacity style={[styles.navButton, styles.leftButton]} onPress={goToPrevious}>
                <ChevronLeft size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {currentIndex < images.length - 1 && (
            <Animated.View style={[fadeStyle]}>
              <TouchableOpacity style={[styles.navButton, styles.rightButton]} onPress={goToNext}>
                <ChevronRight size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

interface ImageZoomViewProps {
  uri: string;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  isLoading: boolean;
  onSingleTap: () => void;
  fadeStyle: any; // Add fadeStyle to props
}

function ImageZoomView({ uri, onLoadStart, onLoadEnd, isLoading, onSingleTap, fadeStyle }: ImageZoomViewProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const singleTap = Gesture.Tap().onEnd(() => {
    if (scale.value <= 1) {
      onSingleTap();
    }
  });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Race(
    Gesture.Simultaneous(pinchGesture, panGesture),
    Gesture.Exclusive(doubleTap, singleTap)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetZoom = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, []);

  return (
    <GestureHandlerRootView style={styles.imageContainer}>
      <GestureDetector gesture={composed}>
        <Animated.View>
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={resetZoom}
            delayLongPress={200}
          >
            <>
              {isLoading && (
                <ActivityIndicator 
                  size="large" 
                  color="#FFFFFF" 
                  style={styles.loader} 
                />
              )}
              <Animated.Image
                source={{ uri }}
                style={[styles.image, animatedStyle]}
                resizeMode="contain"
                onLoadStart={onLoadStart}
                onLoadEnd={onLoadEnd}
              />
            </>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
      {!isLoading && (
        <Animated.View style={[styles.zoomInstruction, fadeStyle]}>
          <Text style={styles.zoomText}>Double tap to zoom • Pinch to zoom • Long press to reset</Text>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  closeButton: {
    padding: 10,
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  imageContainer: {
    flex: 1,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.8,
    resizeMode: 'contain',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 10,
  },
  leftButton: {
    left: 20,
  },
  rightButton: {
    right: 20,
  },
  loader: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1,
  },
  zoomInstruction: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoomText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
