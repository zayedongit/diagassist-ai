import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { LabRangeBar } from "@/components/LabRangeBar";
import { EnhancedAnalysisResult, LegacyAnalysisResult } from "@/types/medicalAnalysis";

interface UnderstandingYourNumbersProps {
  analysisData: EnhancedAnalysisResult | LegacyAnalysisResult;
}

export const UnderstandingYourNumbers = ({ analysisData }: UnderstandingYourNumbersProps) => {
  // Collect all abnormal labs from medical panels
  const abnormalLabs: any[] = [];
  
  if ('medicalPanels' in analysisData && analysisData.medicalPanels) {
    for (const panel of analysisData.medicalPanels) {
      if (panel.abnormalLabs) {
        abnormalLabs.push(...panel.abnormalLabs.filter(lab => 
          lab.value !== 'AUTO-DETECTED' && 
          lab.value !== 'See Report' &&
          !lab.name.toLowerCase().includes('blood group') &&
          !lab.name.toLowerCase().includes('sample type')
        ));
      }
    }
  }

  // Filter out duplicate labs and prioritize the most important ones
  const uniqueAbnormalLabs = abnormalLabs.filter((lab, index, self) =>
    index === self.findIndex(l => l.name === lab.name)
  );

  const getParameterContext = (lab: any) => {
    const labName = lab.name.toLowerCase();
    const value = parseFloat(lab.value);
    
    // Use the same comprehensive contexts from ParameterContextSection
    const contexts: Record<string, { whatItMeans: string; possibleCauses: string[]; bodyConnection: string; }> = {
      // BLOOD SUGAR
      'hba1c': {
        whatItMeans: `HbA1c of ${lab.value}${lab.unit || '%'} reflects your average blood sugar over 2-3 months. ${
          value >= 11 ? 'This level requires immediate endocrinology consultation for severe diabetes.' :
          value >= 9 ? 'This indicates poorly controlled diabetes requiring medication adjustment.' :
          value >= 7 ? 'This is above diabetes target. With proper care, many improve to <7%.' :
          value >= 6.5 ? 'This indicates diabetes. Early intervention prevents complications.' :
          value >= 5.7 ? 'This is pre-diabetes range. Lifestyle changes can prevent progression.' :
          'This shows room for improvement.'
        } HbA1c is the gold standard for diabetes monitoring.`,
        possibleCauses: ['Type 2 diabetes with inadequate medication', 'Insulin resistance', 'High refined carb diet', 'Physical inactivity', 'Stress', 'Medication non-compliance', 'Undiagnosed Type 1 diabetes', 'Pancreatic disorders'],
        bodyConnection: `Elevated glucose damages blood vessels throughout your body, affecting eyes (diabetic retinopathy), kidneys (nephropathy), nerves (neuropathy), and heart. Each 1% HbA1c reduction decreases complications by 37% and heart attack risk by 14%.`
      },
      'glucose': {
        whatItMeans: `Blood glucose of ${lab.value} ${lab.unit || 'mg/dL'} ${
          value >= 300 ? 'is dangerously high—emergency attention needed.' :
          value >= 200 ? 'is severely elevated. If fasting, this indicates diabetes.' :
          value >= 126 ? 'is elevated. If fasting, this meets diabetes criteria.' :
          value >= 100 ? 'is pre-diabetes range if fasting.' :
          value < 70 ? 'is low (hypoglycemia). Consume 15g carbs if symptomatic.' :
          'is within range.'
        } Glucose is your body's primary fuel.`,
        possibleCauses: value >= 100 ? ['Diabetes', 'Pre-diabetes', 'High glycemic diet', 'Inactivity', 'Obesity', 'Stress', 'Medications', 'Pancreatitis'] : ['Excess insulin', 'Skipped meals', 'Intense exercise', 'Alcohol', 'Medication timing'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 126 ? 'chronic hyperglycemia causes protein glycation, forming AGEs that damage vessels, nerves, and organs—accelerating aging and disease.' : value >= 100 ? 'this level indicates insulin resistance. Early intervention prevents diabetes.' : value < 70 ? 'low glucose deprives brain/muscles of energy, causing confusion and weakness.' : 'stable glucose provides consistent energy.'}`
      },
      
      // IRON & ANEMIA
      'hemoglobin': {
        whatItMeans: `Hemoglobin of ${lab.value} ${lab.unit || 'g/dL'} ${
          value < 8 ? 'is severely low—urgent hematology consultation and possible transfusion needed.' :
          value < 10 ? 'indicates moderate anemia requiring iron studies and treatment.' :
          value < 12 ? 'is low (mild anemia in women; normal >12 g/dL).' :
          value < 13 ? 'is low (mild anemia in men; normal >13 g/dL).' :
          value > 18 ? 'is abnormally high—may indicate polycythemia or dehydration.' :
          'is normal.'
        } Hemoglobin carries oxygen to every cell.`,
        possibleCauses: value < 12 || value < 13 ? ['Iron deficiency (most common)', 'Chronic blood loss', 'B12/folate deficiency', 'Chronic kidney disease', 'Chronic disease', 'Thalassemia', 'Bone marrow disorders'] : ['Polycythemia vera', 'Chronic hypoxia', 'Dehydration', 'Smoking', 'High altitude'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'g/dL'}, ${value < 12 || value < 13 ? 'low hemoglobin reduces oxygen delivery, causing fatigue, weakness, shortness of breath, dizziness, pale skin, and cold extremities. Severe anemia strains the heart, risking heart failure. In pregnancy, increases maternal/fetal risks.' : value > 18 ? 'elevated hemoglobin thickens blood, increasing clot risk (stroke, heart attack, DVT).' : 'normal hemoglobin ensures adequate oxygen for energy and function.'}`
      },
      'ferritin': {
        whatItMeans: `Ferritin of ${lab.value} ${lab.unit || 'ng/mL'} measures iron storage. ${
          value < 15 ? 'This indicates depleted iron stores and iron deficiency anemia.' :
          value < 30 ? 'This is low—iron deficiency anemia is developing.' :
          value < 50 ? 'This is borderline low. Iron stores are suboptimal.' :
          value > 300 ? 'This is elevated—may indicate iron overload, inflammation, or liver disease.' :
          'This is normal.'
        } Ferritin is the most sensitive iron deficiency indicator.`,
        possibleCauses: value < 50 ? ['Inadequate dietary iron', 'Poor absorption', 'Chronic blood loss', 'Pregnancy/breastfeeding', 'Vegetarian/vegan diet', 'Blood donation', 'Athletic training'] : ['Hemochromatosis', 'Liver disease', 'Inflammation', 'Blood transfusions', 'Alcohol abuse', 'Certain cancers'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'ng/mL'}, ${value < 50 ? 'depleted iron prevents hemoglobin production, causing fatigue, weakness, brittle nails, hair loss, restless legs, and cognitive impairment. In children, affects brain development.' : value > 300 ? 'excess iron deposits in organs (liver, heart, pancreas) causing cirrhosis, heart failure, and diabetes. Requires phlebotomy or chelation.' : 'adequate iron supports oxygen transport and energy.'}`
      },
      'iron': {
        whatItMeans: `Serum iron of ${lab.value} ${lab.unit || 'μg/dL'} measures circulating iron. ${
          value < 50 ? 'This is low—indicates iron deficiency with low ferritin and high TIBC.' :
          value < 60 ? 'This is borderline low. Check ferritin and TIBC.' :
          value > 160 ? 'This is elevated—may indicate iron overload or over-supplementation.' :
          'This is normal.'
        } Serum iron varies daily; interpret with ferritin/TIBC.`,
        possibleCauses: value < 60 ? ['Iron deficiency', 'Chronic blood loss', 'Pregnancy', 'Growth spurts', 'Chronic disease', 'Inflammation'] : ['Hemochromatosis', 'Iron poisoning', 'Hemolytic anemia', 'Liver disease', 'Blood transfusions'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'μg/dL'}, ${value < 60 ? 'insufficient iron limits hemoglobin synthesis, reducing oxygen capacity. Causes fatigue, weakness, impaired immunity. Iron is essential for DNA synthesis, neurotransmitters, and energy.' : value > 160 ? 'excess free iron generates oxidative damage. Iron overload harms liver, heart, and endocrine glands.' : 'adequate iron supports RBC production.'}`
      },

      // LIPIDS
      'cholesterol': {
        whatItMeans: `Total cholesterol of ${lab.value} ${lab.unit || 'mg/dL'} ${
          value >= 300 ? 'is very high—severe dyslipidemia with high cardiovascular risk. Cardiology consultation recommended.' :
          value >= 240 ? 'is high, doubling heart disease risk. Statin therapy typically indicated.' :
          value >= 200 ? 'is borderline high. Lifestyle modifications needed.' :
          'is desirable (<200 mg/dL).'
        } Cholesterol builds cell membranes and hormones, but excess causes atherosclerosis.`,
        possibleCauses: ['High saturated fat diet', 'Trans fats', 'Familial hypercholesterolemia', 'Obesity', 'Inactivity', 'Diabetes', 'Hypothyroidism', 'Kidney disease', 'Alcohol', 'Smoking', 'Medications'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 240 ? 'elevated cholesterol forms plaques in coronary arteries, progressively narrowing them. Plaques can rupture, causing heart attacks. Also affects cerebral arteries (stroke), peripheral arteries, and aorta.' : value >= 200 ? 'borderline high cholesterol begins plaque formation. Early intervention prevents cardiovascular disease.' : 'optimal cholesterol protects cardiovascular health.'}`
      },
      'ldl': {
        whatItMeans: `LDL (bad cholesterol) of ${lab.value} ${lab.unit || 'mg/dL'} ${
          value >= 190 ? 'is very high—genetic dyslipidemia. High-intensity statin recommended.' :
          value >= 160 ? 'is high. With diabetes/CVD, aggressive treatment needed.' :
          value >= 130 ? 'is borderline high. With risk factors, treatment recommended.' :
          value >= 100 ? 'is near optimal. For CVD/diabetes, target <70 mg/dL.' :
          'is optimal (<100 mg/dL).'
        } LDL drives atherosclerotic cardiovascular disease.`,
        possibleCauses: ['High saturated fat intake', 'Trans fats', 'Familial hypercholesterolemia', 'Obesity', 'Diabetes', 'Hypothyroidism', 'Kidney disease', 'Medications', 'Sedentary lifestyle'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 160 ? 'elevated LDL infiltrates artery walls, oxidizes, and triggers inflammation. Macrophages form foam cells creating plaques that rupture, causing heart attacks/strokes. Each 39 mg/dL LDL reduction decreases events 20%.' : value >= 100 ? 'moderately elevated LDL begins plaque formation. Early intervention prevents CVD. Statins reduce LDL 30-50%.' : 'optimal LDL minimizes atherosclerosis.'}`
      },
      'hdl': {
        whatItMeans: `HDL (good cholesterol) of ${lab.value} ${lab.unit || 'mg/dL'} ${
          value < 40 ? 'is low in men (normal >40), significantly increasing heart disease risk.' :
          value < 50 ? 'is low in women (normal >50), increasing cardiovascular risk.' :
          value >= 60 ? 'is optimal, protecting against heart disease. High HDL reduces risk 2-3% per 1 mg/dL.' :
          'is normal.'
        } HDL removes cholesterol from arteries; has anti-inflammatory, antioxidant properties.`,
        possibleCauses: value < 50 ? ['Physical inactivity', 'Smoking', 'Obesity', 'Diabetes', 'High refined carbs', 'Genetics', 'Medications', 'Hypertriglyceridemia'] : ['Regular exercise', 'Moderate alcohol', 'Healthy fats', 'Weight loss', 'Genetics'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value < 50 ? 'low HDL reduces reverse cholesterol transport—removing cholesterol from plaques. Low HDL means less antioxidant/anti-inflammatory protection. Each 1 mg/dL HDL decrease increases heart disease 2-3%. Often accompanies metabolic syndrome.' : value >= 60 ? 'high HDL actively removes cholesterol from plaques, preventing/reversing atherosclerosis. Transports antioxidants, reduces inflammation, promotes endothelial function. HDL ≥60 is protective even with other risk factors.' : 'normal HDL provides moderate cardiovascular protection.'}`
      },
      'triglycerides': {
        whatItMeans: `Triglycerides of ${lab.value} ${lab.unit || 'mg/dL'} ${
          value >= 500 ? 'are extremely high—acute pancreatitis risk. Immediate treatment needed.' :
          value >= 200 ? 'are high. With high LDL/diabetes, significantly increases cardiovascular risk.' :
          value >= 150 ? 'are borderline high. Lifestyle modifications recommended.' :
          'are normal (<150 mg/dL).'
        } Triglycerides are fats for energy but promote atherosclerosis when elevated.`,
        possibleCauses: ['High carbohydrate intake', 'Obesity', 'Alcohol', 'Inactivity', 'Diabetes', 'Hypothyroidism', 'Kidney disease', 'Genetics', 'Medications', 'Pregnancy'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 500 ? 'severely elevated triglycerides increase blood viscosity, obstructing pancreatic capillaries—causing acute pancreatitis (life-threatening).' : value >= 200 ? 'high triglycerides contribute to plaques, especially with low HDL/high LDL. Indicate insulin resistance and metabolic syndrome. Dramatically increase CVD risk with diabetes.' : value >= 150 ? 'borderline high suggests excess calories and insulin resistance. Often with obesity, low HDL, hypertension.' : 'normal triglycerides indicate balanced energy metabolism.'}`
      },

      // LIVER
      'alt': {
        whatItMeans: `ALT of ${lab.value} ${lab.unit || 'U/L'} is liver-specific. ${
          value > 200 ? 'Severely elevated—ACUTE HEPATOCELLULAR INJURY. Immediate hepatology consultation required.' :
          value > 100 ? 'Moderately elevated—significant liver inflammation. Requires investigation.' :
          value > 40 ? 'Mildly elevated. Common: fatty liver, alcohol, metabolic syndrome.' :
          'Normal (<40 U/L).'
        } ALT is more specific for liver than AST.`,
        possibleCauses: value > 40 ? ['Non-alcoholic fatty liver disease (most common)', 'Viral hepatitis', 'Alcohol-related liver disease', 'Drug-induced liver injury', 'Autoimmune hepatitis', 'Hemochromatosis', 'Wilson disease', 'Liver ischemia', 'Celiac disease'] : [],
        bodyConnection: `At ${lab.value} ${lab.unit || 'U/L'}, ${value > 200 ? 'severely elevated ALT indicates active liver cell death (necrosis). Requires urgent investigation—acute viral hepatitis, acetaminophen overdose, ischemic hepatitis can cause acute liver failure (fatal without transplant).' : value > 100 ? 'moderately elevated ALT indicates ongoing inflammation. Liver performs 500+ functions: detoxification, protein synthesis, glucose regulation. Persistent inflammation → fibrosis → cirrhosis → failure/cancer. Early intervention reverses damage.' : value > 40 ? 'mildly elevated ALT suggests early inflammation, often fatty liver from obesity/diabetes. Reversible with 5-10% weight loss, exercise, no alcohol.' : 'normal ALT indicates healthy liver.'}`
      },
      'ast': {
        whatItMeans: `AST of ${lab.value} ${lab.unit || 'U/L'} is in liver, heart, muscle. ${
          value > 200 ? 'Severely elevated. With ALT >200, indicates acute liver damage. If AST >> ALT, consider heart/muscle damage.' :
          value > 100 ? 'Moderately elevated. AST/ALT ratio helps: >2 suggests alcohol, <1 suggests fatty liver.' :
          value > 40 ? 'Mildly elevated. Check ratio and consider liver/muscle/heart issues.' :
          'Normal (<40 U/L).'
        } AST is less specific than ALT but helps identify injury source.`,
        possibleCauses: value > 40 ? ['Liver diseases (fatty liver, hepatitis, cirrhosis)', 'Alcoholic liver damage (AST often 2x ALT)', 'Heart attack', 'Muscle damage (rhabdomyolysis)', 'Hemolysis', 'Celiac', 'Hypothyroidism', 'Medications'] : [],
        bodyConnection: `At ${lab.value} ${lab.unit || 'U/L'}, ${value > 200 ? 'severely elevated AST with ALT >200 indicates massive hepatocellular necrosis. If AST >> ALT (ratio >2), consider alcoholic hepatitis, cirrhosis, or non-hepatic causes (MI, rhabdomyolysis). Urgent evaluation needed.' : value > 100 ? 'moderately elevated AST requires ALT interpretation. AST/ALT >2 suggests alcoholic liver disease. <1 suggests fatty liver. Both progress to cirrhosis untreated. AST from heart/muscle needs different urgent interventions.' : value > 40 ? 'mildly elevated AST—check CK (muscle), troponins (heart), liver imaging (fatty liver). If isolated AST, consider hemolysis or exercise.' : 'normal AST indicates no significant tissue damage.'}`
      },

      // KIDNEY
      'creatinine': {
        whatItMeans: `Creatinine of ${lab.value} ${lab.unit || 'mg/dL'} measures kidney function. ${
          value > 3.0 ? 'Severely elevated—CKD Stage 4-5 or acute kidney injury. Urgent nephrology consultation.' :
          value > 1.5 ? 'Moderately elevated—kidney dysfunction (CKD Stage 3). Requires monitoring.' :
          value > 1.2 ? 'Mildly elevated. Early dysfunction, dehydration, or high muscle mass.' :
          'Normal (0.6-1.2 mg/dL).'
        } Creatinine is from muscles, filtered by kidneys.`,
        possibleCauses: value > 1.2 ? ['Chronic kidney disease', 'Acute kidney injury', 'Urinary obstruction', 'Glomerulonephritis', 'Polycystic kidneys', 'Nephrotoxic medications', 'Rhabdomyolysis', 'Heart failure'] : [],
        bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value > 3.0 ? 'severely elevated creatinine means kidneys at <30% capacity. Waste/toxins accumulate causing uremia, hyperkalemia, acidosis, anemia. May need dialysis/transplant. Complications: heart disease, bone disease, electrolyte emergencies.' : value > 1.5 ? 'moderately elevated indicates significant dysfunction. Kidneys regulate fluid, BP, electrolytes, acid-base, vitamin D, RBC production. Impairment causes hypertension, anemia, bone disease, CVD. Progression slowed with BP control (ACE-I/ARBs), diabetes management, avoiding nephrotoxins.' : value > 1.2 ? 'mildly elevated suggests early dysfunction or decreased blood flow from dehydration, heart failure, medications. Early detection allows intervention to prevent progression. CKD increases heart disease 2-3x.' : 'normal creatinine indicates healthy kidney filtration.'}`
      },

      // THYROID
      'tsh': {
        whatItMeans: `TSH of ${lab.value} ${lab.unit || 'mIU/L'} controls thyroid hormones. ${
          value > 10 ? 'Severely elevated—hypothyroidism (underactive thyroid). Endocrinology consultation recommended.' :
          value > 4.0 ? 'Mildly elevated—subclinical hypothyroidism. Monitor, may require treatment.' :
          value < 0.1 ? 'Severely suppressed—hyperthyroidism (overactive thyroid). Can cause heart problems.' :
          value < 0.4 ? 'Low—mild hyperthyroidism or thyroid over-replacement.' :
          'Normal (0.4-4.0 mIU/L).'
        } TSH is most sensitive thyroid test.`,
        possibleCauses: value > 4.0 ? ['Hashimoto thyroiditis (autoimmune)', 'Iodine deficiency', 'Thyroid surgery/radioiodine', 'Medications (lithium, amiodarone)', 'Pituitary tumor'] : ['Graves disease (autoimmune)', 'Toxic nodules', 'Thyroiditis', 'Excessive thyroid medication', 'Pituitary dysfunction'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'mIU/L'}, ${value > 10 ? 'severely elevated TSH means pituitary desperately stimulating underactive thyroid. Hypothyroidism slows metabolism: fatigue, weight gain, depression, constipation, cold intolerance, dry skin, hair loss, weakness, high cholesterol, irregular periods. Untreated severe hypothyroidism → myxedema coma (life-threatening). Levothyroxine normalizes metabolism/symptoms.' : value > 4.0 ? 'mildly elevated TSH indicates early hypothyroidism. Even subclinical hypothyroidism increases cholesterol, heart disease, pregnancy complications. Treatment depends on symptoms/antibodies.' : value < 0.1 ? 'severely suppressed TSH indicates hyperthyroidism—excess thyroid hormone accelerating metabolism. Causes anxiety, insomnia, tachycardia, palpitations, weight loss, tremors, heat intolerance, frequent bowel movements. Untreated → atrial fibrillation, stroke, osteoporosis, thyroid storm (life-threatening). Treatment: antithyroid drugs, radioiodine, or surgery.' : value < 0.4 ? 'mildly suppressed TSH suggests mild overactivity. May cause subtle symptoms and bone loss. Requires monitoring, possibly medication adjustment.' : 'normal TSH indicates balanced thyroid regulating metabolism, energy, growth.'}`
      },

      // VITAMINS
      'vitamin d': {
        whatItMeans: `Vitamin D of ${lab.value} ${lab.unit || 'ng/mL'} ${
          value < 12 ? 'is severely deficient. Immediate high-dose supplementation (50,000 IU weekly) prevents bone disease.' :
          value < 20 ? 'is deficient. Daily supplementation (1000-2000 IU) required.' :
          value < 30 ? 'is insufficient. Supplementation (800-1000 IU daily) recommended.' :
          value > 100 ? 'is excessively high. Stop supplementation to prevent toxicity.' :
          'is optimal (30-50 ng/mL).'
        } Vitamin D is actually a hormone regulating calcium and immunity.`,
        possibleCauses: value < 30 ? ['Limited sun exposure', 'Dark skin', 'High latitude/winter', 'Aging', 'Obesity', 'Malabsorption', 'Liver/kidney disease', 'Medications'] : ['Excessive supplementation'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'ng/mL'}, ${value < 20 ? 'severe deficiency impairs calcium absorption, causing rickets (children) and osteomalacia (adults). Also compromises immunity (infections, autoimmunity), increases CVD risk, contributes to depression, causes muscle weakness/falls, linked to cancer risk. Vitamin D regulates 200+ genes controlling cell growth, immunity, inflammation.' : value < 30 ? 'insufficient vitamin D reduces calcium absorption, depleting bone density. Associates with infections, fatigue, mood issues, potentially higher autoimmune/cancer risk. Supplementation improves bone health, immunity, reduces fall risk.' : value > 100 ? 'excessive vitamin D causes hypercalcemia (nausea, vomiting, confusion, kidney stones, potentially kidney failure). Discontinue supplementation and monitor calcium.' : 'optimal vitamin D supports calcium absorption for strong bones, regulates immune system, maintains muscle strength, supports mood, reduces CVD risk.'}`
      },
      'b12': {
        whatItMeans: `Vitamin B12 of ${lab.value} ${lab.unit || 'pg/mL'} ${
          value < 200 ? 'is deficient. Can cause irreversible neurological damage. Urgent B12 injections or high-dose oral supplementation needed.' :
          value < 300 ? 'is borderline low. Supplementation recommended if symptomatic.' :
          value > 1000 ? 'is very high from supplementation; generally not harmful but stop excess intake.' :
          'is normal (>300 pg/mL).'
        } B12 is essential for nerves, DNA, and RBC formation.`,
        possibleCauses: value < 300 ? ['Pernicious anemia (autoimmune)', 'Vegetarian/vegan diet', 'Malabsorption (celiac, Crohn, gastric bypass)', 'Medications (metformin, PPIs, H2 blockers)', 'Aging', 'H. pylori', 'Alcohol abuse'] : ['B12 supplementation', 'Liver disease', 'Myeloproliferative disorders'],
        bodyConnection: `At ${lab.value} ${lab.unit || 'pg/mL'}, ${value < 200 ? 'severe B12 deficiency causes megaloblastic anemia (fatigue, weakness, breathlessness). More critically, causes irreversible neurological damage: peripheral neuropathy (numbness/tingling), balance problems, memory loss, dementia, subacute combined degeneration (paralysis). Psychiatric: depression, psychosis, cognitive decline. Early B12 injections prevent permanent nerve damage.' : value < 300 ? 'borderline B12 may cause subtle symptoms: fatigue, weakness, difficulty concentrating, mood changes, mild neuropathy. Progress to severe complications untreated. Supplementation (1000 mcg daily or injections) prevents progression, often improves symptoms.' : value > 1000 ? 'very high B12 from supplementation is not harmful. Water-soluble; excess excreted. Extremely elevated levels (>2000) may rarely indicate liver disease, blood cancers, or excessive supplementation.' : 'normal B12 supports RBC formation, neurological function, DNA synthesis, energy production. Stored in liver for 2-4 years.'}`
      }
    };

    // Find matching context with priority for longer (more specific) matches
    const sortedKeys = Object.keys(contexts).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (labName.includes(key)) {
        return contexts[key];
      }
    }

    // Specific message for unknown parameters
    return {
      whatItMeans: `${lab.name} at ${lab.value} ${lab.unit || ''} is ${lab.status}. Your healthcare provider can interpret this parameter in context of your complete health picture.`,
      possibleCauses: ['Various medical conditions', 'Lifestyle factors (diet, exercise, stress)', 'Medications', 'Genetic factors', 'Recent illness or activities', 'Other health conditions'],
      bodyConnection: 'This parameter provides information about specific physiological processes. Your healthcare provider can explain its significance and necessary follow-up based on your individual health status and medical history.'
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'low':
        return <TrendingDown className="w-4 h-4 text-blue-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'low':
        return 'outline';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (uniqueAbnormalLabs.length === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <BarChart3 className="w-5 h-5" />
            Understanding Your Numbers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-green-700 text-center">
              <strong>Great news!</strong> All your test values are within normal ranges. 
              Keep up the good work with your current lifestyle!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-persian-blue">
          <BarChart3 className="w-5 h-5" />
          Understanding Your Numbers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Detailed explanations of your abnormal test results
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {uniqueAbnormalLabs.map((lab, index) => {
          const context = getParameterContext(lab);
          const statusIcon = getStatusIcon(lab.status);
          
          return (
            <Collapsible key={index}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-primary/20 hover:bg-white/80 transition-colors">
                  <div className="flex items-center gap-3">
                    {statusIcon}
                    <div className="text-left">
                      <h4 className="font-medium text-persian-blue">{lab.name}</h4>
                      <p className="text-sm text-persian-blue">
                        {lab.value} {lab.unit} (Ref: {lab.referenceRange || 'N/A'})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadge(lab.status)}>
                      {lab.status?.toUpperCase()}
                    </Badge>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                 <div className="mt-2 p-4 bg-white/40 rounded-lg border border-primary/10 space-y-4">
                    {/* Lab Range Bar with Dynamic Positioning */}
                    {!isNaN(parseFloat(lab.value)) && parseFloat(lab.value) > 0 && (
                      <LabRangeBar
                        labName={lab.name}
                        value={lab.value}
                        unit={lab.unit}
                        referenceRange={lab.referenceRange}
                        status={lab.status || 'normal'}
                      />
                    )}
                  
                  {/* What It Means */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">What It Means</h5>
                    <p className="text-sm text-gray-800 bg-blue-50 p-3 rounded border border-blue-200 leading-relaxed">
                      {context.whatItMeans}
                    </p>
                  </div>
                  
                  {/* Body Connection */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Body Connection</h5>
                    <p className="text-sm text-gray-800 bg-green-50 p-3 rounded border border-green-200 leading-relaxed">
                      {context.bodyConnection}
                    </p>
                  </div>
                  
                  {/* Possible Contributing Factors */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Possible Contributing Factors</h5>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <ul className="space-y-1">
                        {context.possibleCauses.map((cause, causeIndex) => (
                          <li key={causeIndex} className="text-sm text-gray-800 flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></span>
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        
        {/* Special Note for AUTO-DETECTED values */}
        <div className="mt-4 p-3 bg-muted/10 rounded-lg border border-border/20">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> These explanations are for educational purposes. 
            Always discuss your results with your healthcare provider for proper interpretation and treatment recommendations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};