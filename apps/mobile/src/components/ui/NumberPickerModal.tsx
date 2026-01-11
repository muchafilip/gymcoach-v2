import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';

interface NumberPickerModalProps {
  visible: boolean;
  title: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  decimals?: boolean;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export default function NumberPickerModal({
  visible,
  title,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  decimals = false,
  onConfirm,
  onCancel,
}: NumberPickerModalProps) {
  const { colors } = useThemeStore();
  const [selectedValue, setSelectedValue] = useState(value);
  const scrollViewRef = useRef<ScrollView>(null);

  const generateData = () => {
    const data: number[] = [];
    for (let i = min; i <= max; i += step) {
      data.push(i);
    }
    return data;
  };

  const data = generateData();

  useEffect(() => {
    if (visible) {
      setSelectedValue(value);
      const index = data.findIndex((v) => v === value);
      if (index >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: false,
          });
        }, 50);
      }
    }
  }, [visible, value]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < data.length) {
      setSelectedValue(data[index]);
    }
  };

  const formatValue = (val: number) => {
    const displayValue = decimals ? val.toFixed(1) : val.toString();
    return unit ? `${displayValue} ${unit}` : displayValue;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.overlay} onPress={onCancel} />

        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onCancel} style={styles.headerButton}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={() => onConfirm(selectedValue)} style={styles.headerButton}>
              <Text style={[styles.confirmText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.pickerWrapper}>
            <View
              style={[
                styles.selectedHighlight,
                { backgroundColor: colors.surfaceAlt },
              ]}
            />
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={{
                paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
              }}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleScroll}
              onScrollEndDrag={handleScroll}
            >
              {data.map((val) => (
                <View key={val} style={styles.item}>
                  <Text
                    style={[
                      styles.itemText,
                      { color: val === selectedValue ? colors.text : colors.textMuted },
                      val === selectedValue && styles.selectedText,
                    ]}
                  >
                    {formatValue(val)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 17,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerWrapper: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  selectedHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 16,
    right: 16,
    height: ITEM_HEIGHT,
    borderRadius: 10,
  },
  scrollView: {
    flex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 22,
  },
  selectedText: {
    fontWeight: '600',
  },
});
