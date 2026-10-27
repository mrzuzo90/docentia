import {
  CreditPack,
  CreditTransaction,
  SubscriptionPlan,
  SubscriptionTierId,
  UserBillingAccount
} from '../types';

const BILLING_STORAGE_KEY = 'docentia_billing_account_v1';

export const CREDITS_PER_EXAM_GENERATION = 1;
export const SUBMISSIONS_PER_GRADING_CREDIT = 5;

// Real unit economics (our internal SaaS AI cost in EUR)
export const ESTIMATED_AI_COST_PER_GENERATION_EUR = 0.004; // ~0.4 cents of a euro
export const ESTIMATED_AI_COST_PER_SUBMISSION_EUR = 0.0015; // ~0.15 cents per graded student

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Claustro Abierto',
    badge: 'PRUEBA GRATUITA',
    priceEur: 0,
    billingPeriod: 'gratis',
    monthlyEquivalentEur: 0,
    creditsIncluded: 3,
    rolloverCredits: false,
    description: 'Para probar el motor de síntesis y la corrección óptica con tu propio temario antes de decidir.',
    features: [
      '3 Créditos de bienvenida incluidos (pago único)',
      '1 Crédito = 1 Examen + Solucionario completo',
      '1 Crédito = Hasta 5 exámenes corregidos por OCR',
      'Exportación a Portapapeles, Markdown y Moodle Aiken',
      'Coste de servidores de IA 100% incluido'
    ]
  },
  {
    id: 'pro_monthly',
    name: 'Docente Titular Pro',
    badge: 'MÁS ELEGIDO · MENSUAL',
    priceEur: 12,
    billingPeriod: 'mes',
    monthlyEquivalentEur: 12,
    creditsIncluded: 60,
    rolloverCredits: true,
    highlighted: true,
    description: 'Pensado para profesores en activo con evaluación continua. Tus créditos no gastados se acumulan para el mes de exámenes.',
    features: [
      '60 Créditos nuevos cada mes (equivale a 300 alumnos corregidos)',
      'Acumulación de créditos no usados (Rollover trimestral)',
      'Motor IA de alta precisión incluido sin configurar API Keys',
      'Pliego Oficial A4 e Impresión Directa sin marcas de agua',
      ' Cuaderno Séneca / Libro de Calificaciones con exportación CSV',
      'Prioridad en la cola de visión artificial OCR manuscrito'
    ]
  },
  {
    id: 'pro_annual',
    name: 'Docente Titular Anual',
    badge: 'AHORRA 31% · CURSO COMPLETO',
    priceEur: 99,
    billingPeriod: 'año',
    monthlyEquivalentEur: 8.25,
    creditsIncluded: 750,
    rolloverCredits: true,
    description: 'Cubre todo el curso académico (septiembre a julio) con una bolsa global de 750 créditos disponible desde el primer día.',
    features: [
      '750 Créditos disponibles desde el día 1 para todo el curso',
      'Sale a solo 8,25 €/mes (ahorro de 45 € frente al plan mensual)',
      'Ideal para picos de evaluaciones trimestrales y extraordinarias',
      'Todas las ventajas y exportaciones del Plan Docente Titular Pro',
      'Factura fiscal deducible para formación / material docente'
    ]
  },
  {
    id: 'school',
    name: 'Departamento / Centro',
    badge: 'LICENCIA B2B · HASTA 10 DOCENTES',
    priceEur: 49,
    billingPeriod: 'mes',
    monthlyEquivalentEur: 49,
    creditsIncluded: 300,
    rolloverCredits: true,
    description: 'Bolsa compartida para departamentos didácticos, academias de oposiciones, institutos y colegios concertados o privados.',
    features: [
      '300 Créditos/mes compartidos (hasta 1.500 exámenes corregidos/mes)',
      'Hasta 10 puestos de profesor bajo una misma cuenta',
      'Membrete oficial del centro preconfigurado en todos los pliegos A4',
      'Acumulación de créditos (Rollover) durante todo el curso escolar',
      'Facturación institucional para secretaría del centro'
    ]
  }
];

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_single',
    name: 'Unidad Suelta · Examen Express',
    badge: 'PAGO POR UNIDAD',
    credits: 2,
    priceEur: 1.90,
    pricePerCreditEur: 0.95,
    equivalentDescription: '1 Examen generado + 5 alumnos corregidos',
    description: 'Pago puntual para salir de un apuro en un examen concreto sin comprometerte a ningún plan.'
  },
  {
    id: 'pack_convocatoria',
    name: 'Pack Convocatoria',
    badge: 'SUPERKITS SIN CUOTA',
    credits: 15,
    priceEur: 9.00,
    pricePerCreditEur: 0.60,
    equivalentDescription: 'Ej. 3 Exámenes creados + 60 alumnos corregidos',
    description: 'El favorito para semanas de exámenes parciales o finales. Pagas una sola vez y los créditos no caducan en 12 meses.',
    popular: true
  },
  {
    id: 'pack_trimestre',
    name: 'Pack Evaluación Trimestral',
    badge: 'MÁXIMO AHORRO PREPAGO',
    credits: 40,
    priceEur: 19.00,
    pricePerCreditEur: 0.48,
    equivalentDescription: 'Ej. 5 Exámenes creados + 175 alumnos corregidos',
    description: 'Bolsa prepago para cubrir toda una evaluación en varios grupos sin suscripción mensual.'
  }
];

function createDefaultAccount(): UserBillingAccount {
  const now = new Date().toISOString();
  const initialTx: CreditTransaction = {
    id: 'tx-welcome-001',
    timestamp: now,
    description: 'Bono de bienvenida · Claustro Abierto (3 créditos gratuitos)',
    creditsDelta: 3,
    balanceAfter: 3,
    category: 'welcome',
    estimatedAiCostEur: 0,
    amountPaidEur: 0
  };

  return {
    userName: 'Prof. Titular',
    userEmail: 'docente@claustro.edu.es',
    institution: 'Departamento Didáctico',
    tierId: 'free',
    tierName: 'Claustro Abierto (Prueba)',
    creditsBalance: 3,
    monthlyAllowance: 3,
    totalExamsGenerated: 0,
    totalSubmissionsGraded: 0,
    totalSpentEur: 0,
    totalEstimatedAiCostEur: 0,
    transactions: [initialTx]
  };
}

export class BillingService {
  static getAccount(): UserBillingAccount {
    try {
      const raw = localStorage.getItem(BILLING_STORAGE_KEY);
      if (!raw) {
        const fresh = createDefaultAccount();
        this.saveAccount(fresh);
        return fresh;
      }
      return JSON.parse(raw) as UserBillingAccount;
    } catch {
      return createDefaultAccount();
    }
  }

  static saveAccount(account: UserBillingAccount): void {
    try {
      localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(account));
    } catch (e) {
      console.warn('No se pudo persistir la cuenta de créditos en localStorage:', e);
    }
  }

  static calculateGenerationCredits(): number {
    return CREDITS_PER_EXAM_GENERATION;
  }

  static calculateGradingCredits(submissionsCount: number): number {
    if (submissionsCount <= 0) return 0;
    return Math.max(1, Math.ceil(submissionsCount / SUBMISSIONS_PER_GRADING_CREDIT));
  }

  static hasEnoughCredits(requiredCredits: number): boolean {
    const account = this.getAccount();
    return account.creditsBalance >= requiredCredits;
  }

  static consumeCreditsForGeneration(examTitle: string): {
    success: boolean;
    account: UserBillingAccount;
    transactionId?: string;
  } {
    const account = this.getAccount();
    const cost = this.calculateGenerationCredits();

    if (account.creditsBalance < cost) {
      return { success: false, account };
    }

    const newBalance = account.creditsBalance - cost;
    const txId = `tx-gen-${Date.now()}`;
    const tx: CreditTransaction = {
      id: txId,
      timestamp: new Date().toISOString(),
      description: `Síntesis de Examen + Solucionario: "${examTitle || 'Evaluación'}"`,
      creditsDelta: -cost,
      balanceAfter: newBalance,
      category: 'generation',
      estimatedAiCostEur: ESTIMATED_AI_COST_PER_GENERATION_EUR
    };

    const updated: UserBillingAccount = {
      ...account,
      creditsBalance: newBalance,
      totalExamsGenerated: account.totalExamsGenerated + 1,
      totalEstimatedAiCostEur: Number(
        (account.totalEstimatedAiCostEur + ESTIMATED_AI_COST_PER_GENERATION_EUR).toFixed(4)
      ),
      transactions: [tx, ...account.transactions].slice(0, 60)
    };

    this.saveAccount(updated);
    return { success: true, account: updated, transactionId: txId };
  }

  static consumeCreditsForGrading(submissionsCount: number, examTitle: string): {
    success: boolean;
    account: UserBillingAccount;
    creditsUsed: number;
    transactionId?: string;
  } {
    const account = this.getAccount();
    const cost = this.calculateGradingCredits(submissionsCount);

    if (account.creditsBalance < cost) {
      return { success: false, account, creditsUsed: cost };
    }

    const aiCost = Number((submissionsCount * ESTIMATED_AI_COST_PER_SUBMISSION_EUR).toFixed(4));
    const newBalance = account.creditsBalance - cost;
    const txId = `tx-grade-${Date.now()}`;
    const tx: CreditTransaction = {
      id: txId,
      timestamp: new Date().toISOString(),
      description: `Corrección Óptica OCR (${submissionsCount} ${submissionsCount === 1 ? 'examen' : 'exámenes'} · "${examTitle}")`,
      creditsDelta: -cost,
      balanceAfter: newBalance,
      category: 'grading',
      estimatedAiCostEur: aiCost
    };

    const updated: UserBillingAccount = {
      ...account,
      creditsBalance: newBalance,
      totalSubmissionsGraded: account.totalSubmissionsGraded + submissionsCount,
      totalEstimatedAiCostEur: Number((account.totalEstimatedAiCostEur + aiCost).toFixed(4)),
      transactions: [tx, ...account.transactions].slice(0, 60)
    };

    this.saveAccount(updated);
    return { success: true, account: updated, creditsUsed: cost, transactionId: txId };
  }

  static refundTransaction(creditsToRefund: number, reason: string): UserBillingAccount {
    const account = this.getAccount();
    const newBalance = account.creditsBalance + creditsToRefund;
    const tx: CreditTransaction = {
      id: `tx-refund-${Date.now()}`,
      timestamp: new Date().toISOString(),
      description: `Reembolso automático: ${reason}`,
      creditsDelta: creditsToRefund,
      balanceAfter: newBalance,
      category: 'refund',
      estimatedAiCostEur: 0
    };

    const updated: UserBillingAccount = {
      ...account,
      creditsBalance: newBalance,
      transactions: [tx, ...account.transactions].slice(0, 60)
    };
    this.saveAccount(updated);
    return updated;
  }

  static purchasePack(packId: string): UserBillingAccount {
    const account = this.getAccount();
    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) return account;

    const newBalance = account.creditsBalance + pack.credits;
    const tx: CreditTransaction = {
      id: `tx-pack-${Date.now()}`,
      timestamp: new Date().toISOString(),
      description: `Compra puntual: ${pack.name} (+${pack.credits} créditos)`,
      creditsDelta: pack.credits,
      balanceAfter: newBalance,
      category: 'pack_purchase',
      amountPaidEur: pack.priceEur
    };

    const updated: UserBillingAccount = {
      ...account,
      creditsBalance: newBalance,
      totalSpentEur: Number((account.totalSpentEur + pack.priceEur).toFixed(2)),
      transactions: [tx, ...account.transactions].slice(0, 60)
    };

    this.saveAccount(updated);
    return updated;
  }

  static activateSubscription(planId: SubscriptionTierId): UserBillingAccount {
    const account = this.getAccount();
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return account;

    const nextDate = new Date();
    if (plan.billingPeriod === 'año') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    // Rollover existing credits + add new plan credits
    const newBalance = plan.id === 'free'
      ? Math.max(account.creditsBalance, 3)
      : account.creditsBalance + plan.creditsIncluded;

    const tx: CreditTransaction = {
      id: `tx-sub-${Date.now()}`,
      timestamp: new Date().toISOString(),
      description: `Suscripción activada: ${plan.name} (+${plan.creditsIncluded} créditos)`,
      creditsDelta: plan.id === 'free' ? 0 : plan.creditsIncluded,
      balanceAfter: newBalance,
      category: 'subscription',
      amountPaidEur: plan.priceEur
    };

    const updated: UserBillingAccount = {
      ...account,
      tierId: plan.id,
      tierName: plan.name,
      creditsBalance: newBalance,
      monthlyAllowance: plan.creditsIncluded,
      renewsAt: plan.id === 'free' ? undefined : nextDate.toISOString(),
      cancelAtPeriodEnd: false,
      totalSpentEur: Number((account.totalSpentEur + plan.priceEur).toFixed(2)),
      transactions: [tx, ...account.transactions].slice(0, 60)
    };

    this.saveAccount(updated);
    return updated;
  }

  static toggleCancelAtPeriodEnd(): UserBillingAccount {
    const account = this.getAccount();
    const updated: UserBillingAccount = {
      ...account,
      cancelAtPeriodEnd: !account.cancelAtPeriodEnd
    };
    this.saveAccount(updated);
    return updated;
  }
}
