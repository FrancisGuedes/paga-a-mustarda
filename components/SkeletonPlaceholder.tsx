// // components/ui/SkeletonPlaceholder.tsx
// import React, { useEffect, useRef } from 'react';
// import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

// interface SkeletonPlaceholderProps {
//     width: number | string;
//     height: number;
//     style?: ViewStyle | ViewStyle[];
//     circle?: boolean;
// }

// const SkeletonPlaceholder: React.FC<SkeletonPlaceholderProps> = ({
//     width,
//     height,
//     style,
//     circle = false
// }) => {
//     const pulseAnim = useRef(new Animated.Value(0.5)).current; // Começa com uma opacidade base

//     useEffect(() => {
//         const sharedAnimation = Animated.loop(
//             Animated.sequence([
//                 Animated.timing(pulseAnim, {
//                     toValue: 1,
//                     duration: 700,
//                     useNativeDriver: true,
//                 }),
//                 Animated.timing(pulseAnim, {
//                     toValue: 0.5, // Volta para a opacidade base
//                     duration: 700,
//                     useNativeDriver: true,
//                 }),
//             ])
//         );
//         sharedAnimation.start();
//         return () => {
//             sharedAnimation.stop();
//         };
//     }, [pulseAnim]);

//     return (
//         <Animated.View
//             style={[
//                 styles.placeholder,
//                 {
//                     width,
//                     height,
//                     borderRadius: circle ? height / 2 : 4, // Raio para círculo ou cantos arredondados padrão
//                     opacity: pulseAnim
//                 },
//                 style, // Permite estilos adicionais passados via props
//             ]}
//         />
//     );
// };

// const styles = StyleSheet.create({
//     placeholder: {
//         backgroundColor: '#E0E0E0', // Cor padrão do esqueleto
//     },
// });

// export default SkeletonPlaceholder;