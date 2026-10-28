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
  SUBSCRIPTION_PLANS
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
      periodLabel: 'Pago único · Sin suscripción recurrente'
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
    }, 450);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1040px] bg-white border border-[#d6d6d6] rounded-[28px] overflow-hidden my-auto max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-white px-7 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#d6d6d6]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center p-2">
              <img src="/assets/mascot/lechuza-mark.svg" alt="Docentia" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold tracking-wider uppercase text-[#707070]">
                IA Integral Incluida · Sin Configurar API Keys
              </span>
              <h3 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#1d1d1f]">
                Planes y Billetera Docente
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-full px-4 py-1.5 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] uppercase text-[#707070] font-medium">Saldo:</span>
                <span className="font-semibold text-[#1d1d1f]">
                  {account.creditsBalance} {account.creditsBalance === 1 ? 'crédito' : 'créditos'}
                </span>
              </div>
              <div className="h-4 w-px bg-[#d6d6d6]" />
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] uppercase text-[#707070] font-medium">Plan:</span>
                <span className="font-semibold text-[#1d1d1f]">{account.tierName}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] flex items-center justify-center transition"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Insufficient Credits Alert Banner */}
        {insufficientCreditsMessage && (
          <div className="bg-[#b64400]/10 border-b border-[#b64400]/20 text-[#b64400] px-7 py-3 flex items-center gap-2.5 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{insufficientCreditsMessage}</span>
          </div>
        )}

        {/* Navigation Tabs & Equivalences */}
        <div className="bg-[#fafafc] border-b border-[#d6d6d6] px-7 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#707070]">
            <span className="px-2.5 py-1 rounded-full bg-white border border-[#d6d6d6] text-[#1d1d1f] font-medium">
              1 crédito = 1 examen generado
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white border border-[#d6d6d6] text-[#707070]">
              1 crédito = 5 alumnos evaluados OCR
            </span>
          </div>

          <div className="bg-[#e8e8ed] p-1 rounded-full inline-flex gap-1">
            <button
              onClick={() => {
                setSelectedCheckoutItem(null);
                setActiveTab('plans');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                activeTab === 'plans'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Suscripciones
              </span>
            </button>
            <button
              onClick={() => {
                setSelectedCheckoutItem(null);
                setActiveTab('packs');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                activeTab === 'packs'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Packs por Unidad
              </span>
            </button>
            <button
              onClick={() => {
                setSelectedCheckoutItem(null);
                setActiveTab('ledger');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                activeTab === 'ledger'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Extracto ({account.transactions.length})
              </span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-7 overflow-y-auto flex-1 space-y-6 bg-white">
          {selectedCheckoutItem ? (
            <div className="max-w-xl mx-auto rounded-[28px] border border-[#d6d6d6] p-7 space-y-6 bg-[#fafafc]">
              <div className="flex items-start justify-between border-b border-[#d6d6d6] pb-5">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0071e3]">
                    Activación Inmediata
                  </span>
                  <h4 className="text-[24px] font-semibold text-[#1d1d1f] mt-1">
                    {selectedCheckoutItem.name}
                  </h4>
                  <p className="text-[14px] text-[#707070] mt-1">
                    {selectedCheckoutItem.periodLabel} · Suma{' '}
                    <strong className="text-[#1d1d1f]">+{selectedCheckoutItem.credits} créditos</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[32px] font-bold text-[#1d1d1f]">
                    {selectedCheckoutItem.priceEur.toFixed(2).replace('.', ',')} €
                  </span>
                  <span className="block text-[11px] text-[#707070] uppercase">
                    IVA incluido
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#707070]">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-[18px] border text-left transition ${
                      paymentMethod === 'card'
                        ? 'border-[#0071e3] bg-white ring-2 ring-[#0071e3]/20 text-[#1d1d1f]'
                        : 'border-[#d6d6d6] bg-white text-[#707070] hover:border-[#1d1d1f]/30'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1.5 text-[#1d1d1f]" />
                    <div className="text-[13px] font-semibold text-[#1d1d1f]">Tarjeta / Apple Pay</div>
                    <div className="text-[11px] text-[#707070]">Instantáneo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bizum')}
                    className={`p-3.5 rounded-[18px] border text-left transition ${
                      paymentMethod === 'bizum'
                        ? 'border-[#0071e3] bg-white ring-2 ring-[#0071e3]/20 text-[#1d1d1f]'
                        : 'border-[#d6d6d6] bg-white text-[#707070] hover:border-[#1d1d1f]/30'
                    }`}
                  >
                    <Zap className="w-4 h-4 mb-1.5 text-[#1d1d1f]" />
                    <div className="text-[13px] font-semibold text-[#1d1d1f]">Bizum Docente</div>
                    <div className="text-[11px] text-[#707070]">Sin comisiones</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('invoice')}
                    className={`p-3.5 rounded-[18px] border text-left transition ${
                      paymentMethod === 'invoice'
                        ? 'border-[#0071e3] bg-white ring-2 ring-[#0071e3]/20 text-[#1d1d1f]'
                        : 'border-[#d6d6d6] bg-white text-[#707070] hover:border-[#1d1d1f]/30'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mb-1.5 text-[#1d1d1f]" />
                    <div className="text-[13px] font-semibold text-[#1d1d1f]">Factura Centro</div>
                    <div className="text-[11px] text-[#707070]">Secretaría</div>
                  </button>
                </div>
              </div>

              <div className="rounded-[20px] bg-white border border-[#d6d6d6] p-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#707070]">
                  <span>Saldo actual en billetera:</span>
                  <span className="font-semibold text-[#1d1d1f]">{account.creditsBalance} créditos</span>
                </div>
                <div className="flex justify-between font-medium text-[#0071e3]">
                  <span>Créditos a abonar hoy:</span>
                  <span>+{selectedCheckoutItem.credits} créditos</span>
                </div>
                <div className="border-t border-[#d6d6d6] pt-2 flex justify-between font-semibold text-base text-[#1d1d1f]">
                  <span>Nuevo saldo disponible:</span>
                  <span>{account.creditsBalance + selectedCheckoutItem.credits} créditos</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCheckoutItem(null)}
                  className="px-5 py-2.5 rounded-full border border-[#d6d6d6] text-[14px] text-[#1d1d1f] hover:bg-white transition"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmPayment}
                  className="flex-1 py-3 px-6 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium flex items-center justify-center gap-2 transition"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Procesando cargo...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        Confirmar ({selectedCheckoutItem.priceEur.toFixed(2).replace('.', ',')} €) y abonar créditos
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
                      <h4 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                        Planes docentes con créditos acumulables
                      </h4>
                      <p className="text-[15px] text-[#707070] mt-1 max-w-2xl">
                        Asumimos íntegramente los costes de inferencia IA. Los créditos no consumidos se reservan para tu periodo de evaluación.
                      </p>
                    </div>

                    <div className="bg-[#e8e8ed] p-1 rounded-full inline-flex">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition ${
                          billingCycle === 'monthly'
                            ? 'bg-white text-[#1d1d1f] shadow-xs'
                            : 'text-[#707070] hover:text-[#1d1d1f]'
                        }`}
                      >
                        Mensual
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition ${
                          billingCycle === 'annual'
                            ? 'bg-white text-[#1d1d1f] shadow-xs'
                            : 'text-[#707070] hover:text-[#1d1d1f]'
                        }`}
                      >
                        Curso Anual (-31%)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {displayedPlans.map(plan => {
                      const isCurrentPlan = account.tierId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          className={`rounded-[28px] p-6 flex flex-col justify-between transition-all border ${
                            plan.highlighted
                              ? 'border-[#1d1d1f] bg-[#fafafc] ring-1 ring-[#1d1d1f]/10'
                              : 'border-[#d6d6d6] bg-white hover:border-[#1d1d1f]/30'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span
                                className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                                  plan.highlighted
                                    ? 'bg-[#1d1d1f] text-white'
                                    : 'bg-[#f5f5f7] text-[#707070] border border-[#d6d6d6]'
                                }`}
                              >
                                {plan.badge}
                              </span>
                              {isCurrentPlan && (
                                <span className="text-[12px] font-semibold text-[#0071e3]">
                                  ● Plan Activo
                                </span>
                              )}
                            </div>

                            <h5 className="text-[24px] font-semibold text-[#1d1d1f]">
                              {plan.name}
                            </h5>

                            <div className="mt-3 pb-4 border-b border-[#d6d6d6] flex items-baseline gap-1.5">
                              <span className="text-[40px] font-bold text-[#1d1d1f] leading-none">
                                {plan.priceEur === 0 ? '0 €' : `${plan.priceEur} €`}
                              </span>
                              {plan.priceEur > 0 && (
                                <span className="text-[14px] text-[#707070]">
                                  / {plan.billingPeriod}
                                </span>
                              )}
                            </div>

                            <div className="my-4 p-3 rounded-[16px] bg-[#f5f5f7] border border-[#d6d6d6] text-[13px] font-medium text-[#1d1d1f]">
                              {plan.creditsIncluded} Créditos{' '}
                              {plan.billingPeriod === 'mes'
                                ? '/ mes'
                                : plan.billingPeriod === 'año'
                                ? '/ curso anual'
                                : 'de prueba'}
                            </div>

                            <p className="text-[14px] text-[#707070] mb-4 leading-relaxed">{plan.description}</p>

                            <ul className="space-y-2.5 mb-6">
                              {plan.features.map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-[14px] text-[#474747]">
                                  <Check className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartPlanCheckout(plan)}
                            className={`w-full py-3 px-5 rounded-full text-[14px] font-medium flex items-center justify-center gap-2 transition ${
                              plan.highlighted
                                ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
                                : 'bg-transparent border border-[#d6d6d6] text-[#1d1d1f] hover:bg-[#f5f5f7]'
                            }`}
                          >
                            <span>
                              {plan.id === 'free'
                                ? 'Usar Plan Gratuito'
                                : isCurrentPlan
                                ? `Añadir +${plan.creditsIncluded} Créditos`
                                : `Activar ${plan.name}`}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 02: PREPAID CREDIT PACKS */}
              {activeTab === 'packs' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
                      Recargas puntuales sin cuota periódica
                    </h4>
                    <p className="text-[15px] text-[#707070] mt-1">
                      Adquiere solo los créditos requeridos para tu convocatoria de exámenes. No caducan a lo largo del curso escolar.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {CREDIT_PACKS.map(pack => (
                      <div
                        key={pack.id}
                        className={`rounded-[28px] p-6 flex flex-col justify-between transition-all border ${
                          pack.popular
                            ? 'border-[#1d1d1f] bg-[#fafafc] ring-1 ring-[#1d1d1f]/10'
                            : 'border-[#d6d6d6] bg-white hover:border-[#1d1d1f]/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f]">
                              {pack.badge}
                            </span>
                            <span className="text-[12px] text-[#707070]">
                              {pack.pricePerCreditEur.toFixed(2).replace('.', ',')} € / cr.
                            </span>
                          </div>

                          <h5 className="text-[24px] font-semibold text-[#1d1d1f]">
                            {pack.name}
                          </h5>

                          <div className="mt-3 pb-4 border-b border-[#d6d6d6] flex items-baseline justify-between">
                            <span className="text-[36px] font-bold text-[#1d1d1f] leading-none">
                              {pack.priceEur.toFixed(2).replace('.', ',')} €
                            </span>
                            <span className="text-[15px] font-semibold text-[#0071e3]">
                              +{pack.credits} Créditos
                            </span>
                          </div>

                          <div className="my-4 p-3 rounded-[16px] bg-[#f5f5f7] border border-[#d6d6d6] text-[13px] text-[#474747] font-medium">
                            {pack.equivalentDescription}
                          </div>

                          <p className="text-[14px] text-[#707070] mb-6 leading-relaxed">{pack.description}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartPackCheckout(pack)}
                          className={`w-full py-3 px-5 rounded-full text-[14px] font-medium flex items-center justify-center gap-2 transition ${
                            pack.popular
                              ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
                              : 'bg-transparent border border-[#d6d6d6] text-[#1d1d1f] hover:bg-[#f5f5f7]'
                          }`}
                        >
                          <span>
                            Comprar +{pack.credits} Créditos ({pack.priceEur.toFixed(2).replace('.', ',')} €)
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Calculator */}
                  <div className="rounded-[28px] border border-[#d6d6d6] bg-[#f5f5f7] p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-[#0071e3]" />
                      <span className="text-[13px] font-semibold uppercase tracking-wider text-[#1d1d1f]">
                        Calculadora de Créditos por Convocatoria
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium text-[#1d1d1f]">
                          <span>Exámenes a redactar:</span>
                          <span className="text-[#0071e3] font-semibold">
                            {calcExamsCount} ({neededCreditsForExams} cr.)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={15}
                          value={calcExamsCount}
                          onChange={e => setCalcExamsCount(Number(e.target.value))}
                          className="w-full accent-[#0071e3]"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium text-[#1d1d1f]">
                          <span>Alumnos a corregir (OCR):</span>
                          <span className="text-[#0071e3] font-semibold">
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
                          className="w-full accent-[#0071e3]"
                        />
                      </div>

                      <div className="p-4 rounded-[20px] bg-white border border-[#d6d6d6] flex items-center justify-between gap-3">
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                            Estimación Requerida
                          </span>
                          <span className="text-[22px] font-bold text-[#1d1d1f]">
                            {totalNeededCredits} Créditos
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartPackCheckout(recommendedPack)}
                          className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium transition"
                        >
                          Elegir ({recommendedPack.priceEur.toFixed(2).replace('.', ',')} €)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 03: WALLET LEDGER & TELEMETRY */}
              {activeTab === 'ledger' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-[24px] border border-[#d6d6d6] bg-[#f5f5f7] p-5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                        Saldo Disponible
                      </span>
                      <div className="text-[32px] font-bold text-[#1d1d1f] mt-1">
                        {account.creditsBalance} créditos
                      </div>
                      <span className="text-[13px] text-[#707070]">
                        Suficiente para evaluar {account.creditsBalance * 5} alumnos
                      </span>
                    </div>

                    <div className="rounded-[24px] border border-[#d6d6d6] bg-[#f5f5f7] p-5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                        Exámenes Generados
                      </span>
                      <div className="text-[32px] font-bold text-[#1d1d1f] mt-1">
                        {account.totalExamsGenerated}
                      </div>
                      <span className="text-[13px] text-[#707070]">Con matriz de pesos y solucionario</span>
                    </div>

                    <div className="rounded-[24px] border border-[#d6d6d6] bg-[#f5f5f7] p-5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                        Alumnos Calificados
                      </span>
                      <div className="text-[32px] font-bold text-[#1d1d1f] mt-1">
                        {account.totalSubmissionsGraded}
                      </div>
                      <span className="text-[13px] text-[#707070]">Evaluados en escala 0 a 10</span>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[#d6d6d6] overflow-hidden bg-white">
                    <div className="px-6 py-4 border-b border-[#d6d6d6] flex items-center justify-between">
                      <span className="text-[13px] font-semibold uppercase tracking-wider text-[#1d1d1f]">
                        Historial de Movimientos
                      </span>
                    </div>
                    <div className="divide-y divide-[#d6d6d6]/60 max-h-64 overflow-y-auto">
                      {account.transactions.length === 0 ? (
                        <div className="px-6 py-8 text-center text-sm text-[#707070]">
                          No hay transacciones registradas aún.
                        </div>
                      ) : (
                        account.transactions.map(tx => (
                          <div
                            key={tx.id}
                            className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#fafafc] transition"
                          >
                            <div>
                              <div className="text-[14px] font-medium text-[#1d1d1f]">{tx.description}</div>
                              <div className="text-[12px] text-[#707070]">
                                {new Date(tx.timestamp).toLocaleString('es-ES')}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`text-[13px] font-semibold px-3 py-1 rounded-full border ${
                                  tx.creditsDelta > 0
                                    ? 'bg-[#f5f5f7] border-[#0071e3] text-[#0071e3]'
                                    : 'bg-[#fafafc] border-[#d6d6d6] text-[#707070]'
                                }`}
                              >
                                {tx.creditsDelta > 0 ? `+${tx.creditsDelta}` : tx.creditsDelta} Cr.
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* SaaS Owner Unit Economics Drawer */}
                  <div className="rounded-[28px] border border-[#d6d6d6] bg-[#fafafc] p-6">
                    <button
                      type="button"
                      onClick={() => setShowOwnerTelemetry(!showOwnerTelemetry)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <TrendingUp className="w-4 h-4 text-[#0071e3]" />
                        <span className="text-[13px] font-semibold uppercase tracking-wider text-[#1d1d1f]">
                          Panel de Rentabilidad del Servicio y Clave Servidor
                        </span>
                      </div>
                      <span className="text-[13px] text-[#0071e3] font-medium">
                        {showOwnerTelemetry ? 'Ocultar panel' : 'Desplegar panel'}
                      </span>
                    </button>

                    {showOwnerTelemetry && (
                      <div className="pt-5 mt-5 border-t border-[#d6d6d6] space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3.5 rounded-[18px] border border-[#d6d6d6] bg-white">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                              Ingresos Cobrados
                            </span>
                            <div className="text-[20px] font-bold text-[#1d1d1f] mt-0.5">
                              {account.totalSpentEur.toFixed(2).replace('.', ',')} €
                            </div>
                          </div>
                          <div className="p-3.5 rounded-[18px] border border-[#d6d6d6] bg-white">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                              Coste Real IA Asumido
                            </span>
                            <div className="text-[20px] font-bold text-[#1d1d1f] mt-0.5">
                              {account.totalEstimatedAiCostEur.toFixed(4).replace('.', ',')} €
                            </div>
                          </div>
                          <div className="p-3.5 rounded-[18px] border border-[#d6d6d6] bg-white">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">
                              Margen Bruto SaaS
                            </span>
                            <div className="text-[20px] font-bold text-[#0071e3] mt-0.5">
                              {grossMarginPercent}%
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1.5">
                            <KeyRound className="w-3.5 h-3.5 inline mr-1 text-[#0071e3]" />
                            Clave Maestra Gemini del Servidor (opcional · oculta a usuarios)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showKeyText ? 'text' : 'password'}
                                value={masterApiKey}
                                onChange={e => setMasterApiKey(e.target.value)}
                                placeholder="AIzaSy... (Clave corporativa del sistema)"
                                className="w-full px-4 py-2 bg-white border border-[#d6d6d6] rounded-full text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                              />
                              <button
                                type="button"
                                onClick={() => setShowKeyText(!showKeyText)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#1d1d1f]"
                              >
                                {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveMasterKey}
                              className="px-5 py-2 rounded-full bg-[#1d1d1f] hover:bg-[#333336] text-white text-sm font-medium transition"
                            >
                              Guardar Clave
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
