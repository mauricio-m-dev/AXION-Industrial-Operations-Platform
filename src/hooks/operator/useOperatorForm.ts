import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export function useOperatorForm(t: (key: string) => string) {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [operatorInfo, setOperatorInfo] = useState({
    name: "",
    matricula: "",
    password: ""
  });

  const [formData, setFormData] = useState({
    type: "",
    location: searchParams.get("linha") || "",
    agv_number: "",
    part_name: "",
    sap_number: "",
    side: "",
    observation: "",
    impact: "",
    downtime: "",
    image: null as File | null,
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("operator-data");
    if (saved) {
      const parsed = JSON.parse(saved);
      setOperatorInfo(parsed);
      setStep(1);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleOperatorLogin = async () => {
    if (!operatorInfo.matricula || !operatorInfo.password) {
      toast.error(t("error.send"));
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ matricula: operatorInfo.matricula, password: operatorInfo.password })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        const loggedInfo = {
          name: data.user.username,
          matricula: data.user.matricula
        };
        sessionStorage.setItem("operator-data", JSON.stringify(loggedInfo));
        setOperatorInfo({...operatorInfo, ...loggedInfo});
        toast.success(t("success.photo") || "Operador identificado!");
        setStep(1);
      } else {
        toast.error(data.error || t("error.send"));
      }
    } catch (error) {
      toast.error(t("error.send"));
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => {
    if (step === 1) {
      sessionStorage.removeItem("operator-data");
      setOperatorInfo({ name: "", matricula: "", password: "" });
    }
    if (step > 1) {
      setFormData({
        type: "",
        location: searchParams.get("linha") || "",
        agv_number: "",
        part_name: "",
        sap_number: "",
        side: "",
        observation: "",
        impact: "",
        downtime: "",
        image: null,
      });
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    }
    setStep(prev => prev - 1);
  };

  const handleTypeSelect = (type: string) => {
    if (type === "Colisão") {
      setFormData({ 
        ...formData, 
        type,
        impact: "total",
        downtime: "more"
      });
    } else {
      setFormData({ 
        ...formData, 
        type,
        impact: "",
        downtime: ""
      });
    }
    setStep(2);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setImagePreview(newPreviewUrl);

      try {
        const imageCompression = (await import('browser-image-compression')).default;
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: false };
        const compressedBlob = await imageCompression(file, options);
        const compressedFile = new File([compressedBlob], file.name, { type: file.type });
        setFormData({ ...formData, image: compressedFile });
        toast.success(t("success.photo") || "Foto otimizada com sucesso!");
      } catch (error) {
        setFormData({ ...formData, image: file });
        toast.success(t("success.photo"));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.location) return toast.error(t("error.loc"));
    if (!formData.observation.trim()) return toast.error(t("error.obs_required"));
    
    setSubmitting(true);
    const data = new FormData();
    
    data.append("type", formData.type);
    data.append("location", formData.location);
    data.append("agv_number", formData.agv_number);
    data.append("part_name", formData.part_name);
    data.append("sap_number", formData.sap_number);
    data.append("side", formData.side);
    data.append("observation", formData.observation);
    data.append("operator_name", operatorInfo.name);
    data.append("operator_matricula", operatorInfo.matricula);
    data.append("impact", formData.impact);
    data.append("downtime", formData.downtime);
    if (formData.image) {
      data.append("image", formData.image, formData.image.name || "evidence.jpg");
    }

    try {
      const response = await fetch("/api/tickets", { 
        method: "POST", 
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: data 
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setTicketId(result.ticketId);
        setFeedbackText("");
        setFeedbackSent(false);
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
          setImagePreview(null);
        }
        setStep(4);
      } else {
        toast.error(result.error || t("error.send"));
      }
    } catch (error) {
      toast.error(t("error.send"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          matricula: operatorInfo.matricula,
          name: operatorInfo.name,
          feedback: feedbackText
        })
      });
      if (response.ok) {
        toast.success(t("toast.feedback_sent"));
        setFeedbackText("");
        setFeedbackSent(true);
      } else {
        toast.error(t("error.send_feedback"));
      }
    } catch (e) {
      toast.error(t("error.send_feedback"));
    }
  };

  const resetForm = () => {
    setFormData({ ...formData, type: "", agv_number: "", part_name: "", sap_number: "", side: "", observation: "", impact: "", downtime: "", image: null });
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setStep(1);
  };

  return {
    step,
    submitting,
    ticketId,
    feedbackText,
    setFeedbackText,
    feedbackSent,
    imagePreview,
    operatorInfo,
    setOperatorInfo,
    formData,
    setFormData,
    handleOperatorLogin,
    nextStep,
    prevStep,
    handleTypeSelect,
    handleFileChange,
    handleSubmit,
    handleSendFeedback,
    resetForm
  };
}
