import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, Hash, Calculator } from 'lucide-react-native';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

const percentages = [
    { reps: 1, percentage: 100 },
    { reps: 2, percentage: 95 },
    { reps: 4, percentage: 90 },
    { reps: 6, percentage: 85 },
    { reps: 8, percentage: 80 },
    { reps: 10, percentage: 75 },
    { reps: 12, percentage: 70 },
    { reps: 16, percentage: 65 },
    { reps: 20, percentage: 60 },
    { reps: 24, percentage: 55 },
    { reps: 30, percentage: 50 }
];

type Formula = 'brzycki' | 'epley' | 'lander';

export default function CalculatorScreen() {
    const { t } = useTranslation();
    const [weight, setWeight] = useState<string>('');
    const [reps, setReps] = useState<string>('');
    const [formula, setFormula] = useState<Formula>('brzycki');

    const result = useMemo(() => {
        const weightNum = parseFloat(weight);
        const repsNum = parseInt(reps);

        if (!weightNum || !repsNum) return 0;

        let oneRm = 0;
        if (formula === 'brzycki') {
            oneRm = weightNum / (1.0278 - 0.0278 * repsNum);
        } else if (formula === 'epley') {
            oneRm = weightNum * (1 + 0.0333 * repsNum);
        } else {
            oneRm = (100 * weightNum) / (101.3 - 2.67123 * repsNum);
        }
        return Math.round(oneRm * 10) / 10; // Round to 1 decimal
    }, [weight, reps, formula]);

    const renderFormulaButton = (value: Formula, label: string) => (
        <Pressable
            onPress={() => setFormula(value)}
            style={[
                styles.formulaButton,
                formula === value && styles.formulaButtonActive
            ]}
        >
            <View style={[
                styles.radioOuter,
                formula === value && styles.radioOuterActive
            ]}>
                {formula === value && <View style={styles.radioInner} />}
            </View>
            <Text style={[
                styles.formulaText,
                formula === value && styles.formulaTextActive
            ]}>{label}</Text>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <DashboardHeader />
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('calculator.title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('calculator.subtitle')}</Text>
                </View>

                <Card glass style={styles.mainCard}>
                    <CardHeader>
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultLabel}>{t('calculator.estimated_1rm')}</Text>
                            <Text style={styles.resultValue}>
                                {result > 0 ? `${result} ${t('calculator.unit_kg')}` : '-'}
                            </Text>
                        </View>
                    </CardHeader>
                    
                    <CardContent style={styles.inputsContent}>
                        <View style={styles.row}>
                            <View style={styles.flex1}>
                                <Input
                                    label={t('calculator.weight_label')}
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    leftIcon={<Dumbbell size={18} color={Colors.text.muted} />}
                                />
                            </View>
                            <View style={styles.flex1}>
                                <Input
                                    label={t('calculator.reps_label')}
                                    value={reps}
                                    onChangeText={setReps}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    leftIcon={<Hash size={18} color={Colors.text.muted} />}
                                />
                            </View>
                        </View>

                        <View style={styles.formulaSection}>
                            <Text style={styles.inputLabel}>{t('calculator.formula_label')}</Text>
                            <View style={styles.formulaGroup}>
                                {renderFormulaButton('brzycki', 'Brzycki')}
                                {renderFormulaButton('epley', 'Epley')}
                                {renderFormulaButton('lander', 'Lander')}
                            </View>
                        </View>
                    </CardContent>
                </Card>

                {result > 0 && (
                     <Card glass style={styles.tableCard}>
                        <CardHeader>
                             <CardTitle style={{ fontSize: 18 }}>{t('calculator.table_title')}</CardTitle>
                        </CardHeader>
                        <View style={styles.tableBlock}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeadText, { flex: 1 }]}>{t('calculator.percentage_col')}</Text>
                                <Text style={[styles.tableHeadText, { flex: 2 }]}>{t('calculator.weight_col')}</Text>
                                <Text style={[styles.tableHeadText, { flex: 1, textAlign: 'right' }]}>{t('calculator.reps_col')}</Text>
                            </View>
                            {percentages.map((item, index) => (
                                <View key={item.reps} style={[
                                    styles.tableRow,
                                    index % 2 === 0 ? styles.tableRowEven : null
                                ]}>
                                    <Text style={[styles.tableCell, { flex: 1, color: Colors.text.muted }]}>
                                        {item.percentage}%
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 2, color: Colors.neon.DEFAULT, fontWeight: '700' }]}>
                                        {((result * item.percentage) / 100).toFixed(1)} {t('calculator.unit_kg')}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                                        {item.reps}
                                    </Text>
                                </View>
                            ))}
                        </View>
                     </Card>
                )}
                
                {/* Bottom spacer for tab bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: Spacing.horizontal,
        gap: 20,
    },
    header: {
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "900",
        color: Colors.text.primary,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.text.secondary,
    },
    mainCard: {
        borderColor: Colors.border.default,
    },
    resultContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    resultLabel: {
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: Colors.text.muted,
        marginBottom: 8,
    },
    resultValue: {
        fontSize: 48,
        fontWeight: '900',
        color: Colors.neon.DEFAULT,
        textShadowColor: Colors.neon.glow,
        textShadowRadius: 10,
        fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    },
    inputsContent: {
        gap: 24,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    flex1: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#a1a1aa", // zinc-400
        marginBottom: 8,
        marginLeft: 4,
    },
    formulaSection: {
        gap: 4,
    },
    formulaGroup: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
    },
    formulaButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    formulaButtonActive: {
        borderColor: Colors.neon.dim,
        backgroundColor: 'rgba(0, 255, 65, 0.05)',
    },
    radioOuter: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: Colors.text.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterActive: {
        borderColor: Colors.neon.DEFAULT,
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.neon.DEFAULT,
    },
    formulaText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.muted,
    },
    formulaTextActive: {
        color: Colors.neon.DEFAULT,
    },
    tableCard: {
        borderColor: Colors.border.default,
    },
    tableBlock: {
        paddingTop: 8,
        paddingBottom: 24,
        paddingHorizontal: 24,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.default,
        marginBottom: 8,
    },
    tableHeadText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.secondary,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    tableRowEven: {
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    tableCell: {
        fontSize: 15,
        color: Colors.text.primary,
        fontWeight: '500',
    },
});
