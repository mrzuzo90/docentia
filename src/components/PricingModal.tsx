import React, { useState } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  CreditCard,
  Coins,
  Layers,
  History,
  ArrowRight,
  Calculator,
  Building2,
  TrendingUp,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  RefreshCw
} from 'lucide-react';
import {
  CreditPack,
  SubscriptionPlan,
  SubscriptionTierId,
  UserBillingAccount
} from '../types';
import {
  BillingService,
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  ESTIMATED_AI_COST_PER_GENERATION_EUR,
  ESTIMATED_AI_COST_PER_SUBMISSION_EUR
} from '../services/billingService';
import { StorageService } from '../services/storageService';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserBillingAccount;
  onAccountChange: (account: UserBillingAccount) => void;
  insufficientCreditsMessage?: string | null;
  initialTab?: 'plans' | 'packs' | 'ledger';
  onNotify: (title: string, description?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  account,
  onAccountChange,
  insufficientCreditsMessage,
  initialTab = 'plans',
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'packs' | 'ledger'>(
    insufficientCreditsMessage ? 'packs' : initialTab
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Interactive Calculator state in Packs tab
  const [calcExamsCount, setCalcExamsCount] = useState<number>(2);
  const [calcStudentsCount, setCalcStudentsCount] = useState<number>(30);

  // Checkout confirmation step state
  const [selectedCheckoutItem, setSelectedCheckoutItem] = useState<{
    kind: 'plan' | 'pack';
    id: string;
    name: string;
    credits: number;
    priceEur: number;
    periodLabel: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bizum' | 'invoice'>('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // SaaS Owner Admin Drawer state
  const [showOwnerTelemetry, setShowOwnerTelemetry] = useState(false);
  const [masterApiKey, setMasterApiKey] = useState(StorageService.getApiKey());
  const [showKeyText, setShowKeyText] = useState(false);

  if (!isOpen) return null;

  const neededCreditsForExams = calcExamsCount * 1;
  const neededCreditsForStudents = Math.ceil(calcStudentsCount / 5);
  const totalNeededCredits = neededCreditsForExams + neededCreditsForStudents;

  const recommendedPack =
    CREDIT_PACKS.find(p => p.credits >= totalNeededCredits) || CREDIT_PACKS[CREDIT_PACKS.length - 1];

  const handleStartPlanCheckout = (plan: SubscriptionPlan) => {
    if (plan.id === 'free') {
      const updated = BillingService.activateSubscription('free');
      onAccountChange(updated);
      onNotify('Plan Claustro Abierto activo', 'Dispones de tus créditos gratuitos de prueba.', 'info');
      return;
    }
    setSelectedCheckoutItem({
      kind: 'plan',
      id: plan.id,
      name: plan.name,
      credits: plan.creditsIncluded,
      priceEur: plan.priceEur,
      periodLabel: plan.billingPeriod === 'año' ? 'Facturación anual' : 'Suscripción mensual'
    });
  };

  const handleStartPackCheckout = (pack: CreditPack) => {
    setSelectedCheckoutItem({
      kind: 'pack',
      id: pack.id,
      name: pack.name,
      credits: pack.credits,
      priceEur: pack.priceEur,
      periodLabel: 'Pago único · Sin suscripción'
    });
  };

  const handleConfirmPayment = () => {
    if (!selectedCheckoutItem) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      let updated: UserBillingAccount;
      if (selectedCheckoutItem.kind === 'plan') {
        updated = BillingService.activateSubscription(selectedCheckoutItem.id as SubscriptionTierId);
        onNotify(
          `Suscripción activada: ${selectedCheckoutItem.name}`,
          `Se han abonado +${selectedCheckoutItem.credits} créditos en tu billetera docente.`,
          'success'
        );
      } else {
        updated = BillingService.purchasePack(selectedCheckoutItem.id);
        onNotify(
          `Recarga completada: +${selectedCheckoutItem.credits} Créditos`,
          `${selectedCheckoutItem.name} añadido a tu saldo disponible (${updated.creditsBalance} créditos).`,
          'success'
        );
      }
      onAccountChange(updated);
      setIsProcessingPayment(false);
      setSelectedCheckoutItem(null);
      if (insufficientCreditsMessage) {
        onClose();
      }
    }, 550);
  };

  const handleSaveMasterKey = () => {
    StorageService.setApiKey(masterApiKey.trim());
    onNotify(
      masterApiKey.trim() ? 'Clave Maestra del SaaS guardada' : 'Modo Motor Local Activo',
      masterApiKey.trim()
        ? 'El servidor usará esta clave de IA de forma transparente para el docente.'
        : 'Se utilizará el motor semántico NLP integrado con coste 0 €.',
      'success'
    );
  };

  const displayedPlans = SUBSCRIPTION_PLANS.filter(plan => {
    if (plan.id === 'free' || plan.id === 'school') return true;
    return billingCycle === 'annual' ? plan.id === 'pro_annual' : plan.id === 'pro_monthly';
  });

  const grossMarginPercent =
    account.totalSpentEur > 0
      ? Math.max(
          0,
          Math.min(
            99.9,
            ((account.totalSpentEur - account.totalEstimatedAiCostEur) / account.totalSpentEur) * 100
          )
        ).toFixed(1)
      : '98.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#000437]/50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1100px] bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top White Header */}
        <div className="bg-[#ffffff] px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#afafaf]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] flex items-center justify-center text-[#58cc02]">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#58cc02]">
                IA 100% INCLUIDA · SIN CONFIGURAR API KEYS
              </span>
              <h3 className="font-feather font-extrabold text-[32px] leading-[1.2] tracking-[-0.02em] text-[#4b4b4b]">
                billetera y planes docentes
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#d7ffb8] border-2 border-[#58cc02] rounded-[12px] px-4 py-2 flex items-center gap-3">
              <div>
                <span className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                  TU SALDO
                </span>
                <span className="text-[19px] font-bold text-[#4b4b4b]">
                  {account.creditsBalance} {account.creditsBalance === 1 ? 'crédito' : 'créditos'}
                </span>
              </div>
              <div className="h-7 w-[2px] bg-[#58cc02]" />
              <div>
                <span className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                  MODALIDAD
                </span>
                <span className="text-[15px] font-bold text-[#4b4b4b]">
                  {account.tierName}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="duo-nav-pill p-2.5"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Insufficient Credits Alert Banner */}
        {insufficientCreditsMessage && (
          <div className="bg-[#d7ffb8] border-b-2 border-[#58cc02] text-[#4b4b4b] px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-[15px] font-bold">
              <AlertCircle className="w-5 h-5 text-[#58cc02] shrink-0" />
              <span>{insufficientCreditsMessage}</span>
            </div>
          </div>
        )}

        {/* Value Equivalence Bar & Tabs */}
        <div className="bg-[#ffffff] border-b-2 border-[#afafaf] px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[15px] font-bold text-[#4b4b4b]">
            <span className="px-2.5 py-1 rounded-[12px] bg-[#d7ffb8] text-[#4b4b4b] border-2 border-[#58cc02] text-[13px] uppercase tracking-[0.053em]">
              1 CRÉDITO = 1 EXAMEN CREADO
            </span>
            <span className="px-2.5 py-1 rounded-[12px] bg-[#ffffff] text-[#1cb0f6] border-2 border-[#afafaf] text-[13px] uppercase tracking-[0.053em]">
              1 CRÉDITO = 5 ALUMNOS CORREGIDOS OCR
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCheckoutItem(null);
                setActiveTab('plans');
              }}
              className={`duo-nav-pill py-2 px-3.5 ${
                activeTab === 'plans' ? 'duo-nav-pill-active' : ''
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>SUSCRIPCIONES</span>
            </button>
            <button
              onClick={() => {
                setSelectedCheckoutItem(null);
                setActiveTab('packs');
              }}
              className={`duo-nav-pill py-2 px-3.5 ${
                activeTab === 'packs' ? 'duo-nav-pill-active' : ''
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>POR UNIDAD / PACKS</span>
            </button>
            <button
              onClick={() => {
                setSelectedCheckoutItem(null);
                setActiveTab('ledger');
              }}
              className={`duo-nav-pill py-2 px-3.5 ${
                activeTab === 'ledger' ? 'duo-nav-pill-active' : ''
              }`}
            >
              <History className="w-4 h-4" />
              <span>EXTRACTO ({account.transactions.length})</span>
            </button>
          </div>
        </div>

        {/* Main Scrollable Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#ffffff]">
          {selectedCheckoutItem ? (
            <div className="max-w-2xl mx-auto duo-card border-[#58cc02] space-y-6">
              <div className="flex items-start justify-between border-b-2 border-[#afafaf] pb-4">
                <div>
                  <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#58cc02]">
                    ACTIVACIÓN INMEDIATA
                  </span>
                  <h4 className="text-[32px] font-bold text-[#4b4b4b] mt-1">
                    {selectedCheckoutItem.name}
                  </h4>
                  <p className="duo-body-copy mt-1">
                    {selectedCheckoutItem.periodLabel} · Suma{' '}
                    <strong className="text-[#4b4b4b]">+{selectedCheckoutItem.credits} créditos</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-feather font-extrabold text-[40px] text-[#58cc02]">
                    {selectedCheckoutItem.priceEur.toFixed(2).replace('.', ',')} €
                  </span>
                  <span className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                    IVA INCLUIDO
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[15px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                  ELIGE MÉTODO DE PAGO
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-[12px] border-2 text-left transition ${
                      paymentMethod === 'card'
                        ? 'border-[#58cc02] bg-[#d7ffb8] text-[#4b4b4b]'
                        : 'border-[#afafaf] bg-[#ffffff] text-[#777777]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1 text-[#4b4b4b]" />
                    <div className="text-[15px] font-bold text-[#4b4b4b]">Tarjeta / Apple Pay</div>
                    <div className="text-[13px]">Al instante</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bizum')}
                    className={`p-3 rounded-[12px] border-2 text-left transition ${
                      paymentMethod === 'bizum'
                        ? 'border-[#58cc02] bg-[#d7ffb8] text-[#4b4b4b]'
                        : 'border-[#afafaf] bg-[#ffffff] text-[#777777]'
                    }`}
                  >
                    <Zap className="w-5 h-5 mb-1 text-[#4b4b4b]" />
                    <div className="text-[15px] font-bold text-[#4b4b4b]">Bizum Docente</div>
                    <div className="text-[13px]">Sin comisiones</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('invoice')}
                    className={`p-3 rounded-[12px] border-2 text-left transition ${
                      paymentMethod === 'invoice'
                        ? 'border-[#58cc02] bg-[#d7ffb8] text-[#4b4b4b]'
                        : 'border-[#afafaf] bg-[#ffffff] text-[#777777]'
                    }`}
                  >
                    <Building2 className="w-5 h-5 mb-1 text-[#4b4b4b]" />
                    <div className="text-[15px] font-bold text-[#4b4b4b]">Factura Centro</div>
                    <div className="text-[13px]">Secretaría</div>
                  </button>
                </div>
              </div>

              <div className="duo-card bg-[#ffffff] space-y-2">
                <div className="flex justify-between text-[17px] text-[#777777]">
                  <span>Saldo actual:</span>
                  <span className="font-bold text-[#4b4b4b]">{account.creditsBalance} créditos</span>
                </div>
                <div className="flex justify-between text-[17px] font-bold text-[#58cc02]">
                  <span>Créditos a sumar hoy:</span>
                  <span>+{selectedCheckoutItem.credits} créditos</span>
                </div>
                <div className="border-t-2 border-[#afafaf] pt-2 flex justify-between font-bold text-[19px] text-[#4b4b4b]">
                  <span>Nuevo saldo tras confirmar:</span>
                  <span>{account.creditsBalance + selectedCheckoutItem.credits} créditos</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCheckoutItem(null)}
                  className="duo-btn-outlined"
                >
                  ← VOLVER
                </button>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmPayment}
                  className="duo-btn-primary flex-1 py-3.5"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>PROCESANDO...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>
                        CONFIRMAR ({selectedCheckoutItem.priceEur.toFixed(2).replace('.', ',')} €) Y SUMAR CRÉDITOS
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 01: SUBSCRIPTION PLANS */}
              {activeTab === 'plans' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="duo-section-headline text-[36px]">
                        planes con créditos acumulables.
                      </h4>
                      <p className="duo-body-copy mt-1 max-w-2xl">
                        Nosotros asumimos todos los gastos de IA. Los créditos que no uses un mes se guardan para tu semana de exámenes.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`duo-nav-pill py-2 px-4 ${
                          billingCycle === 'monthly' ? 'duo-nav-pill-active' : ''
                        }`}
                      >
                        MENSUAL
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`duo-nav-pill py-2 px-4 ${
                          billingCycle === 'annual' ? 'duo-nav-pill-active' : ''
                        }`}
                      >
                        CURSO ANUAL (-31%)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {displayedPlans.map(plan => {
                      const isCurrentPlan = account.tierId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          className={`duo-card flex flex-col justify-between ${
                            plan.highlighted ? 'border-[#58cc02]' : 'border-[#afafaf]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span
                                className={`text-[13px] font-bold uppercase tracking-[0.053em] px-2.5 py-1 rounded-[12px] ${
                                  plan.highlighted
                                    ? 'bg-[#d7ffb8] text-[#4b4b4b] border-2 border-[#58cc02]'
                                    : 'bg-[#ffffff] text-[#777777] border-2 border-[#afafaf]'
                                }`}
                              >
                                {plan.badge}
                              </span>
                              {isCurrentPlan && (
                                <span className="text-[13px] font-bold uppercase text-[#58cc02]">
                                  ● ACTIVO
                                </span>
                              )}
                            </div>

                            <h5 className="text-[32px] font-bold text-[#4b4b4b] leading-[1.2]">
                              {plan.name}
                            </h5>

                            <div className="mt-3 pb-4 border-b-2 border-[#afafaf] flex items-baseline gap-1.5">
                              <span className="font-feather font-extrabold text-[48px] leading-none text-[#58cc02]">
                                {plan.priceEur === 0 ? '0 €' : `${plan.priceEur} €`}
                              </span>
                              {plan.priceEur > 0 && (
                                <span className="text-[17px] font-bold text-[#777777]">
                                  / {plan.billingPeriod}
                                </span>
                              )}
                            </div>

                            <div className="my-4 p-3 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] flex items-center justify-between">
                              <span className="text-[15px] font-bold text-[#4b4b4b]">
                                {plan.creditsIncluded} CRÉDITOS{' '}
                                {plan.billingPeriod === 'mes'
                                  ? '/ MES'
                                  : plan.billingPeriod === 'año'
                                  ? '/ AÑO'
                                  : 'DE PRUEBA'}
                              </span>
                            </div>

                            <p className="duo-body-copy mb-4">{plan.description}</p>

                            <ul className="space-y-2.5 mb-6">
                              {plan.features.map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-[15px] font-medium text-[#4b4b4b]">
                                  <Check className="w-5 h-5 text-[#58cc02] shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartPlanCheckout(plan)}
                            className={plan.highlighted ? 'duo-btn-primary w-full' : 'duo-btn-outlined w-full'}
                          >
                            <span>
                              {plan.id === 'free'
                                ? 'USAR PLAN GRATUITO'
                                : isCurrentPlan
                                ? `AÑADIR +${plan.creditsIncluded} CRÉDITOS`
                                : `ACTIVAR ${plan.name}`}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 02: SINGLE-UNIT & PREPAID CREDIT PACKS */}
              {activeTab === 'packs' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="duo-section-headline text-[36px]">
                      pago por unidad sin cuota mensual.
                    </h4>
                    <p className="duo-body-copy mt-1">
                      Compra solo los créditos que necesites para tus exámenes de hoy. No caducan durante el curso escolar.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {CREDIT_PACKS.map(pack => (
                      <div
                        key={pack.id}
                        className={`duo-card flex flex-col justify-between ${
                          pack.popular ? 'border-[#58cc02]' : 'border-[#afafaf]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[13px] font-bold uppercase tracking-[0.053em] px-2.5 py-1 rounded-[12px] bg-[#d7ffb8] text-[#4b4b4b] border-2 border-[#58cc02]">
                              {pack.badge}
                            </span>
                            <span className="text-[13px] font-bold text-[#777777]">
                              {pack.pricePerCreditEur.toFixed(2).replace('.', ',')} € / cr.
                            </span>
                          </div>

                          <h5 className="text-[32px] font-bold text-[#4b4b4b] leading-[1.2]">
                            {pack.name}
                          </h5>

                          <div className="mt-3 pb-4 border-b-2 border-[#afafaf] flex items-baseline justify-between">
                            <span className="font-feather font-extrabold text-[48px] leading-none text-[#58cc02]">
                              {pack.priceEur.toFixed(2).replace('.', ',')} €
                            </span>
                            <span className="text-[19px] font-bold text-[#1cb0f6]">
                              +{pack.credits} CRÉDITOS
                            </span>
                          </div>

                          <div className="my-4 p-3 rounded-[12px] border-2 border-[#afafaf] text-[15px] font-bold text-[#4b4b4b]">
                            {pack.equivalentDescription}
                          </div>

                          <p className="duo-body-copy mb-6">{pack.description}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartPackCheckout(pack)}
                          className={pack.popular ? 'duo-btn-primary w-full' : 'duo-btn-outlined w-full'}
                        >
                          <span>
                            COMPRAR +{pack.credits} CRÉDITOS ({pack.priceEur.toFixed(2).replace('.', ',')} €)
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Calculator */}
                  <div className="duo-card border-[#afafaf]">
                    <div className="flex items-center gap-2 mb-4">
                      <Calculator className="w-5 h-5 text-[#58cc02]" />
                      <span className="text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                        CALCULADORA DE CRÉDITOS POR CONVOCATORIA
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[15px] font-bold text-[#4b4b4b]">
                          <span>Exámenes a crear:</span>
                          <span className="text-[#58cc02]">
                            {calcExamsCount} ({neededCreditsForExams} cr.)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={15}
                          value={calcExamsCount}
                          onChange={e => setCalcExamsCount(Number(e.target.value))}
                          className="w-full accent-[#58cc02]"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[15px] font-bold text-[#4b4b4b]">
                          <span>Alumnos a corregir (OCR):</span>
                          <span className="text-[#1cb0f6]">
                            {calcStudentsCount} al. ({neededCreditsForStudents} cr.)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={5}
                          value={calcStudentsCount}
                          onChange={e => setCalcStudentsCount(Number(e.target.value))}
                          className="w-full accent-[#58cc02]"
                        />
                      </div>

                      <div className="p-4 rounded-[12px] bg-[#d7ffb8] border-2 border-[#58cc02] flex items-center justify-between gap-3">
                        <div>
                          <span className="block text-[13px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                            NECESITAS
                          </span>
                          <span className="text-[28px] font-bold text-[#4b4b4b]">
                            {totalNeededCredits} Créditos
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartPackCheckout(recommendedPack)}
                          className="duo-btn-primary"
                        >
                          ELEGIR ({recommendedPack.priceEur.toFixed(2).replace('.', ',')} €)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 03: WALLET LEDGER & OWNER UNIT ECONOMICS */}
              {activeTab === 'ledger' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="duo-card">
                      <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                        SALDO ACTUAL
                      </span>
                      <div className="font-feather font-extrabold text-[36px] text-[#58cc02] mt-1">
                        {account.creditsBalance} créditos
                      </div>
                      <span className="text-[15px] text-[#777777]">
                        Da para corregir {account.creditsBalance * 5} alumnos
                      </span>
                    </div>

                    <div className="duo-card">
                      <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                        EXÁMENES GENERADOS
                      </span>
                      <div className="font-feather font-extrabold text-[36px] text-[#4b4b4b] mt-1">
                        {account.totalExamsGenerated}
                      </div>
                      <span className="text-[15px] text-[#777777]">Con solucionario completo</span>
                    </div>

                    <div className="duo-card">
                      <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                        ALUMNOS CORREGIDOS
                      </span>
                      <div className="font-feather font-extrabold text-[36px] text-[#1cb0f6] mt-1">
                        {account.totalSubmissionsGraded}
                      </div>
                      <span className="text-[15px] text-[#777777]">Evaluados de 0 a 10</span>
                    </div>
                  </div>

                  <div className="duo-card p-0 overflow-hidden">
                    <div className="px-5 py-3 border-b-2 border-[#afafaf] flex items-center justify-between">
                      <span className="text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                        HISTORIAL DE CRÉDITOS
                      </span>
                    </div>
                    <div className="divide-y-2 divide-[#afafaf]/40 max-h-60 overflow-y-auto">
                      {account.transactions.map(tx => (
                        <div
                          key={tx.id}
                          className="px-5 py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <div className="text-[17px] font-bold text-[#4b4b4b]">{tx.description}</div>
                            <div className="text-[13px] text-[#777777]">
                              {new Date(tx.timestamp).toLocaleString('es-ES')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[15px] font-bold px-3 py-1 rounded-[12px] border-2 ${
                                tx.creditsDelta > 0
                                  ? 'bg-[#d7ffb8] border-[#58cc02] text-[#4b4b4b]'
                                  : 'bg-[#ffffff] border-[#afafaf] text-[#4b4b4b]'
                              }`}
                            >
                              {tx.creditsDelta > 0 ? `+${tx.creditsDelta}` : tx.creditsDelta} Cr.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SaaS Owner Unit Economics & Server AI Key Drawer */}
                  <div className="duo-card">
                    <button
                      type="button"
                      onClick={() => setShowOwnerTelemetry(!showOwnerTelemetry)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#58cc02]" />
                        <span className="text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b]">
                          PANEL INTERNO PROPIETARIO SAAS · RENTABILIDAD IA Y CLAVE SERVIDOR
                        </span>
                      </div>
                      <span className="text-[15px] font-bold text-[#1cb0f6]">
                        {showOwnerTelemetry ? 'OCULTAR ▲' : 'ABRIR ▼'}
                      </span>
                    </button>

                    {showOwnerTelemetry && (
                      <div className="pt-4 mt-4 border-t-2 border-[#afafaf] space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-[12px] border-2 border-[#afafaf]">
                            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                              INGRESOS COBRADOS
                            </span>
                            <div className="text-[24px] font-bold text-[#58cc02] mt-0.5">
                              {account.totalSpentEur.toFixed(2).replace('.', ',')} €
                            </div>
                          </div>
                          <div className="p-3 rounded-[12px] border-2 border-[#afafaf]">
                            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                              COSTE REAL IA ASUMIDO
                            </span>
                            <div className="text-[24px] font-bold text-[#4b4b4b] mt-0.5">
                              {account.totalEstimatedAiCostEur.toFixed(4).replace('.', ',')} €
                            </div>
                          </div>
                          <div className="p-3 rounded-[12px] border-2 border-[#afafaf]">
                            <span className="text-[13px] font-bold uppercase tracking-[0.053em] text-[#777777]">
                              MARGEN BRUTO SAAS
                            </span>
                            <div className="text-[24px] font-bold text-[#1cb0f6] mt-0.5">
                              {grossMarginPercent}%
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[15px] font-bold uppercase tracking-[0.053em] text-[#4b4b4b] mb-1">
                            <KeyRound className="w-4 h-4 inline mr-1 text-[#58cc02]" />
                            CLAVE MAESTRA DE IA DEL SERVIDOR (OCULTA AL PROFESOR)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showKeyText ? 'text' : 'password'}
                                value={masterApiKey}
                                onChange={e => setMasterApiKey(e.target.value)}
                                placeholder="AIzaSy... (Clave corporativa de nuestro SaaS)"
                                className="w-full px-4 py-2.5 bg-[#ffffff] border-2 border-[#afafaf] rounded-[12px] text-[15px] text-[#4b4b4b]"
                              />
                              <button
                                type="button"
                                onClick={() => setShowKeyText(!showKeyText)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777777]"
                              >
                                {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveMasterKey}
                              className="duo-btn-primary"
                            >
                              GUARDAR CLAVE
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
