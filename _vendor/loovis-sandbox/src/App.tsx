import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Standards from "./pages/Standards";
import Knowledge from "./pages/Knowledge";
import Competition from "./pages/Competition";
import Salary from "./pages/Salary";
import Questionnaire from "./pages/Questionnaire";
import AIChat from "./pages/AIChat";
import Training from "./pages/Training";
import CustomerBasics from "./pages/training/CustomerBasics";
import ProductLine from "./pages/training/ProductLine";
import POSSystem from "./pages/training/POSSystem";
import FrameSelection from "./pages/training/FrameSelection";
import Reviews from "./pages/Reviews";
import ReviewsDetail from "./pages/ReviewsDetail";
import RequireAttention from "./pages/RequireAttention";
import NotOnTime from "./pages/NotOnTime";
import Repairs from "./pages/Repairs";
import Returns from "./pages/Returns";
import MetricDetail from "./pages/MetricDetail";
import ManagerDetail from "./pages/ManagerDetail";
import CRM from "./pages/CRM";
import HealthPassport from "./pages/HealthPassport";
import NotFound from "./pages/NotFound";
import SalaryCalculatorPage from "./pages/SalaryCalculatorPage";
import BranchCalculatorPage from "./pages/BranchCalculatorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/standards" element={<Standards />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/competition" element={<Competition />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="/training" element={<Training />} />
          <Route path="/training/customer-basics" element={<CustomerBasics />} />
          <Route path="/training/product-line" element={<ProductLine />} />
          <Route path="/training/pos-system" element={<POSSystem />} />
          <Route path="/training/frame-selection" element={<FrameSelection />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/reviews-detail" element={<ReviewsDetail />} />
          <Route path="/require-attention" element={<RequireAttention />} />
          <Route path="/not-on-time" element={<NotOnTime />} />
          <Route path="/repairs" element={<Repairs />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/dashboard/metric/:metricId" element={<MetricDetail />} />
          <Route path="/dashboard/manager/:managerId" element={<ManagerDetail />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/health-passport" element={<HealthPassport />} />
          <Route path="/calculator" element={<SalaryCalculatorPage />} />
          <Route path="/calculator/:branchId" element={<BranchCalculatorPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
