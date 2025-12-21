import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      question: "كيف يمكنني الطلب؟",
      answer:
        "يمكنك الطلب بسهولة عن طريق تصفح المتاجر في الصفحة الرئيسية، اختيار وجباتك المفضلة، إضافتها للسلة، ثم إتمام عملية الدفع.",
    },
    {
      question: "ما هي طرق الدفع المتاحة؟",
      answer:
        "نوفر الدفع عند الاستلام، البطاقات الائتمانية (Visa, MasterCard)، ومدى.",
    },
    {
      question: "هل يمكنني إلغاء الطلب؟",
      answer:
        "نعم، يمكنك إلغاء الطلب طالما أنه في حالة 'قيد الانتظار'. بمجرد بدء التحضير، لا يمكن الإلغاء.",
    },
    {
      question: "كم يستغرق التوصيل؟",
      answer:
        "يعتمد وقت التوصيل على بعد المتجر عن موقعك، ولكننا نسعى دائماً للتوصيل في أسرع وقت ممكن (عادة 30-45 دقيقة).",
    },
    {
      question: "كيف يمكنني تتبع طلبي؟",
      answer:
        "يمكنك تتبع حالة الطلب وموقع السائق مباشرة من صفحة 'طلباتي' ثم اختيار الطلب الحالي.",
    },
  ];

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">الأسئلة الشائعة</h1>
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-right font-medium text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
