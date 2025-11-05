import { LabValue } from "@/types/medicalAnalysis";

interface ParameterContext {
  whatItMeans: string;
  possibleCauses: string[];
  bodyConnection: string;
}

export function getParameterContext(lab: LabValue): ParameterContext {
  const labName = lab.name.toLowerCase();
  const value = parseFloat(lab.value);
  const status = lab.status.toLowerCase();
  
  // Comprehensive parameter contexts with clinical precision
  const contexts: Record<string, ParameterContext> = {
    // BLOOD SUGAR & DIABETES
    'hba1c': {
      whatItMeans: `Your HbA1c of ${lab.value}${lab.unit || '%'} reflects your average blood sugar over the past 2-3 months. ${
        value >= 11 ? 'This level requires immediate endocrinology consultation for severe diabetes management.' :
        value >= 9 ? 'This indicates poorly controlled diabetes requiring medication adjustment and lifestyle changes.' :
        value >= 7 ? 'This is above the diabetes management target. With proper care, many people improve to <7%.' :
        value >= 6.5 ? 'This indicates diabetes. Early intervention can prevent complications.' :
        value >= 5.7 ? 'This is in the pre-diabetes range. Lifestyle changes can prevent progression to diabetes.' :
        'This shows room for improvement in blood sugar control.'
      } HbA1c is the gold standard for diabetes monitoring.`,
      possibleCauses: ['Type 2 diabetes with inadequate medication', 'Insulin resistance from obesity or metabolic syndrome', 'Diet high in refined carbs and sugars', 'Lack of regular physical activity', 'Chronic stress elevating cortisol', 'Medication non-compliance', 'Undiagnosed Type 1 diabetes', 'Pancreatic disorders'],
      bodyConnection: `At ${lab.value}${lab.unit || '%'}, elevated glucose damages the microvascular system throughout your body. This particularly affects the eyes (diabetic retinopathy leading to vision loss), kidneys (diabetic nephropathy progressing to kidney failure), nerves (peripheral neuropathy causing numbness and pain), and accelerates atherosclerosis increasing heart attack and stroke risk. Each 1% reduction in HbA1c decreases microvascular complications by 37% and heart attack risk by 14%.`
    },
    'glucose': {
      whatItMeans: `Your blood glucose of ${lab.value} ${lab.unit || 'mg/dL'} ${
        value >= 300 ? 'is dangerously high and requires emergency medical attention to prevent diabetic ketoacidosis.' :
        value >= 200 ? 'is severely elevated. If fasting, this indicates diabetes; immediate medical follow-up needed.' :
        value >= 126 ? 'is elevated. If fasting, this meets diabetes criteria. Consultation with endocrinologist recommended.' :
        value >= 100 ? 'is in the pre-diabetes range if fasting. Lifestyle modifications can prevent diabetes progression.' :
        value < 70 ? 'is low (hypoglycemia). If symptomatic, consume 15g fast-acting carbs immediately.' :
        'is within acceptable range.'
      } Glucose is your body's primary fuel for all cellular functions.`,
      possibleCauses: value >= 100 ? ['Type 2 diabetes', 'Pre-diabetes/insulin resistance', 'High glycemic index diet', 'Physical inactivity', 'Obesity (especially visceral fat)', 'Chronic stress', 'Sleep deprivation', 'Certain medications (steroids, thiazides)', 'Pancreatitis', 'Hormonal disorders (Cushing syndrome, acromegaly)'] : ['Excessive insulin or diabetes medication', 'Skipped or delayed meals', 'Intense exercise without adequate carb intake', 'Alcohol consumption', 'Insulinoma (rare tumor)', 'Adrenal or pituitary insufficiency'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 126 ? 'chronic hyperglycemia causes glycation of proteins throughout your body, forming Advanced Glycation End products (AGEs) that damage blood vessels, nerves, and organs. This accelerates aging and increases risk of heart disease, kidney failure, blindness, and amputations.' : value >= 100 ? 'this level indicates your pancreas is struggling to produce enough insulin or your cells are becoming resistant to insulin. Early intervention prevents progression to diabetes.' : value < 70 ? 'low glucose deprives your brain and muscles of energy, causing confusion, weakness, shakiness, and potentially loss of consciousness if severe.' : 'maintaining stable glucose provides consistent energy and prevents long-term complications.'}`
    },
    
    // IRON STUDIES & ANEMIA
    'hemoglobin': {
      whatItMeans: `Your hemoglobin of ${lab.value} ${lab.unit || 'g/dL'} ${
        value < 8 ? 'is severely low (severe anemia) requiring urgent hematology consultation and possible transfusion.' :
        value < 10 ? 'indicates moderate anemia requiring iron studies to determine cause and treatment.' :
        value < 12 ? 'is low (mild anemia in women; normal lower limit is 12 g/dL). Iron deficiency is most common cause.' :
        value < 13 ? 'is low (mild anemia in men; normal lower limit is 13 g/dL). Requires iron studies evaluation.' :
        value > 18 ? 'is abnormally high, which may indicate polycythemia, dehydration, or chronic hypoxia.' :
        'is within normal range.'
      } Hemoglobin carries oxygen from lungs to every cell in your body.`,
      possibleCauses: value < 12 || value < 13 ? ['Iron deficiency (most common: poor diet, blood loss, malabsorption)', 'Chronic blood loss (GI bleeding, heavy menstruation)', 'Vitamin B12 or folate deficiency (megaloblastic anemia)', 'Chronic kidney disease (decreased erythropoietin)', 'Chronic disease/inflammation (anemia of chronic disease)', 'Thalassemia or sickle cell disease', 'Bone marrow disorders', 'Hemolysis (RBC destruction)'] : ['Polycythemia vera', 'Chronic lung disease/hypoxia', 'Dehydration', 'Smoking', 'High altitude residence', 'Kidney tumors producing excess erythropoietin'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'g/dL'}, ${value < 12 || value < 13 ? 'low hemoglobin means reduced oxygen delivery to tissues. This causes fatigue, weakness, shortness of breath, dizziness, pale skin, cold hands/feet, headaches, and decreased exercise tolerance. Severe anemia strains the heart, causing tachycardia and potentially heart failure. In pregnancy, it increases maternal and fetal risks.' : value > 18 ? 'elevated hemoglobin thickens blood, increasing risk of blood clots (stroke, heart attack, DVT) and reducing blood flow to organs.' : 'normal hemoglobin ensures adequate oxygen delivery for energy production and cellular function.'}`
    },
    'ferritin': {
      whatItMeans: `Ferritin of ${lab.value} ${lab.unit || 'ng/mL'} measures your body's iron storage. ${
        value < 15 ? 'This indicates depleted iron stores and iron deficiency anemia.' :
        value < 30 ? 'This is low, indicating insufficient iron reserves. Iron deficiency anemia is developing.' :
        value < 50 ? 'This is borderline low. Iron stores are suboptimal and may cause symptoms.' :
        value > 300 ? 'This is elevated, which may indicate iron overload, inflammation, liver disease, or hemochromatosis.' :
        'This is within normal range.'
      } Ferritin is the most sensitive indicator of iron deficiency.`,
      possibleCauses: value < 50 ? ['Inadequate dietary iron intake', 'Poor iron absorption (celiac disease, H. pylori, gastric surgery)', 'Chronic blood loss (heavy periods, GI bleeding)', 'Pregnancy and breastfeeding (increased demand)', 'Vegetarian/vegan diet without supplementation', 'Frequent blood donation', 'Intense athletic training'] : ['Hemochromatosis (genetic iron overload)', 'Chronic liver disease', 'Inflammatory conditions (ferritin is an acute phase reactant)', 'Repeated blood transfusions', 'Alcohol abuse', 'Certain cancers or infections'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'ng/mL'}, ${value < 50 ? 'depleted iron stores prevent adequate hemoglobin production, causing fatigue, weakness, brittle nails, hair loss, restless leg syndrome, and impaired cognitive function. In children, iron deficiency affects brain development and learning. Low ferritin precedes anemia and is easier to treat early.' : value > 300 ? 'excess iron deposited in organs (liver, heart, pancreas) causes organ damage. Liver: cirrhosis. Heart: cardiomyopathy. Pancreas: diabetes. Joints: arthritis. Skin: bronze discoloration. Requires phlebotomy or chelation therapy.' : 'adequate iron stores support hemoglobin production, oxygen transport, and energy metabolism.'}`
    },
    'iron': {
      whatItMeans: `Serum iron of ${lab.value} ${lab.unit || 'μg/dL'} measures circulating iron in your blood. ${
        value < 50 ? 'This is low, indicating iron deficiency if combined with low ferritin and high TIBC.' :
        value < 60 ? 'This is borderline low. Check ferritin and TIBC to confirm iron deficiency.' :
        value > 160 ? 'This is elevated, which may indicate iron overload, hemochromatosis, or excessive supplementation.' :
        'This is within normal range.'
      } Serum iron varies throughout the day and is best interpreted with ferritin and TIBC.`,
      possibleCauses: value < 60 ? ['Iron deficiency from poor intake or absorption', 'Chronic blood loss', 'Pregnancy', 'Growth spurts in children', 'Chronic disease', 'Inflammatory conditions'] : ['Hemochromatosis', 'Iron poisoning/over-supplementation', 'Hemolytic anemia', 'Liver disease', 'Repeated blood transfusions', 'Sideroblastic anemia'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'μg/dL'}, ${value < 60 ? 'insufficient circulating iron limits hemoglobin synthesis, reducing oxygen-carrying capacity. This causes fatigue, weakness, pale skin, and impaired immune function. Iron is essential for DNA synthesis, neurotransmitter production, and cellular energy metabolism.' : value > 160 ? 'excess free iron generates reactive oxygen species causing oxidative damage to cells. Iron overload damages liver (cirrhosis), heart (heart failure), and endocrine glands (diabetes, hypogonadism).' : 'adequate circulating iron supports red blood cell production and oxygen delivery.'}`
    },
    'tibc': {
      whatItMeans: `TIBC (Total Iron Binding Capacity) of ${lab.value} ${lab.unit || 'μg/dL'} measures transferrin's iron-carrying capacity. ${
        value > 450 ? 'This is elevated, typically indicating iron deficiency. High TIBC means your body is trying to absorb more iron.' :
        value < 250 ? 'This is low, which may indicate inflammation, liver disease, or iron overload.' :
        'This is within normal range.'
      } TIBC is elevated in iron deficiency and low in iron overload.`,
      possibleCauses: value > 450 ? ['Iron deficiency anemia', 'Pregnancy (increased iron demand)', 'Oral contraceptive use', 'Liver producing more transferrin to capture available iron'] : ['Chronic inflammation or infection', 'Liver disease (decreased transferrin production)', 'Malnutrition/protein deficiency', 'Hemochromatosis (iron overload)', 'Nephrotic syndrome'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'μg/dL'}, ${value > 450 ? 'elevated TIBC indicates your body is iron-starved. Transferrin proteins are abundant but carry little iron, confirming iron deficiency when combined with low ferritin and serum iron. This pattern is diagnostic for iron deficiency anemia.' : value < 250 ? 'low TIBC suggests either excess iron (transferrin is saturated) or decreased transferrin production from liver disease or inflammation. Combined with high ferritin, this indicates iron overload.' : 'normal TIBC reflects balanced iron metabolism and adequate transferrin production.'}`
    },

    // LIPID PROFILE
    'cholesterol': {
      whatItMeans: `Total cholesterol of ${lab.value} ${lab.unit || 'mg/dL'} represents all cholesterol types in your blood. ${
        value >= 300 ? 'This is very high, indicating severe dyslipidemia with high cardiovascular risk. Cardiology consultation recommended.' :
        value >= 240 ? 'This is high, doubling your heart disease risk. Statin therapy typically indicated.' :
        value >= 200 ? 'This is borderline high. Lifestyle modifications and possible medication needed.' :
        'This is in the desirable range (<200 mg/dL).'
      } Cholesterol is essential for cell membranes and hormone production, but excess causes atherosclerosis.`,
      possibleCauses: ['Diet high in saturated fats (red meat, butter, cheese, coconut oil)', 'Trans fats from processed foods', 'Familial hypercholesterolemia (genetic)', 'Obesity and metabolic syndrome', 'Physical inactivity', 'Diabetes', 'Hypothyroidism', 'Kidney disease', 'Excessive alcohol', 'Smoking', 'Certain medications (thiazides, beta-blockers, steroids)'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 240 ? 'elevated cholesterol forms fatty plaques in coronary arteries, progressively narrowing them and reducing blood flow to heart muscle. Plaques can rupture, triggering blood clots that cause heart attacks. High cholesterol also affects cerebral arteries (stroke risk), peripheral arteries (leg claudication), and aorta (aneurysm risk). The inflammatory response to cholesterol deposits accelerates atherosclerosis.' : value >= 200 ? 'borderline high cholesterol begins plaque formation in arteries. Early intervention with diet, exercise, and if needed, statins, prevents cardiovascular disease progression.' : 'optimal cholesterol protects cardiovascular health and supports vital body functions like hormone synthesis and vitamin D production.'}`
    },
    'ldl': {
      whatItMeans: `LDL (bad cholesterol) of ${lab.value} ${lab.unit || 'mg/dL'} ${
        value >= 190 ? 'is very high, indicating genetic dyslipidemia. High-intensity statin therapy recommended regardless of other risk factors.' :
        value >= 160 ? 'is high. If you have diabetes or cardiovascular disease, aggressive treatment is needed.' :
        value >= 130 ? 'is borderline high. With risk factors (diabetes, hypertension, smoking), treatment is recommended.' :
        value >= 100 ? 'is near optimal. For those with heart disease or diabetes, target is <70 mg/dL.' :
        'is optimal (<100 mg/dL).'
      } LDL is the primary driver of atherosclerotic cardiovascular disease.`,
      possibleCauses: ['High saturated fat intake (fatty meats, full-fat dairy)', 'Trans fats (partially hydrogenated oils)', 'Familial hypercholesterolemia', 'Obesity', 'Diabetes and insulin resistance', 'Hypothyroidism', 'Chronic kidney disease', 'Nephrotic syndrome', 'Certain medications', 'Sedentary lifestyle'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 160 ? 'elevated LDL particles infiltrate damaged arterial walls, become oxidized, and trigger immune response. Macrophages engulf oxidized LDL, transforming into foam cells that form fatty streaks—the first stage of atherosclerotic plaques. Over years, plaques grow, calcify, and may rupture, causing heart attacks and strokes. Every 39 mg/dL reduction in LDL decreases cardiovascular events by 20%.' : value >= 100 ? 'moderately elevated LDL begins plaque formation. Early intervention prevents cardiovascular disease. Statins reduce LDL 30-50% and decrease heart attack risk 25-35%.' : 'optimal LDL minimizes atherosclerosis risk. Those with established heart disease or diabetes benefit from even lower targets (<70 mg/dL).'}`
    },
    'hdl': {
      whatItMeans: `HDL (good cholesterol) of ${lab.value} ${lab.unit || 'mg/dL'} ${
        value < 40 ? 'is low in men (normal >40 mg/dL), significantly increasing heart disease risk.' :
        value < 50 ? 'is low in women (normal >50 mg/dL), increasing cardiovascular risk.' :
        value >= 60 ? 'is optimal, providing protective effect against heart disease. High HDL reduces risk by 2-3% for each 1 mg/dL increase.' :
        'is within normal range.'
      } HDL removes cholesterol from arteries and has anti-inflammatory, antioxidant properties.`,
      possibleCauses: value < 50 ? ['Physical inactivity (most common)', 'Smoking (decreases HDL by 10-15%)', 'Obesity and metabolic syndrome', 'Type 2 diabetes', 'High refined carbohydrate intake', 'Genetic factors', 'Certain medications (beta-blockers, thiazides, anabolic steroids)', 'Hypertriglyceridemia'] : ['Regular aerobic exercise', 'Moderate alcohol consumption', 'Healthy fats (olive oil, nuts, fatty fish)', 'Weight loss if overweight', 'Genetic factors (some families have naturally high HDL)'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value < 50 ? 'low HDL reduces reverse cholesterol transport—the process removing cholesterol from arterial plaques back to liver for disposal. Low HDL also means less antioxidant and anti-inflammatory protection for arterial walls. Each 1 mg/dL decrease in HDL increases heart disease risk 2-3%. Low HDL often accompanies metabolic syndrome (high triglycerides, insulin resistance, hypertension).' : value >= 60 ? 'high HDL actively removes cholesterol from developing plaques, preventing and even reversing atherosclerosis. HDL particles also transport antioxidants protecting LDL from oxidation, reduce inflammation in arterial walls, and promote endothelial function. HDL ≥60 mg/dL is a negative risk factor—it reduces cardiovascular risk even if other risk factors are present.' : 'normal HDL provides moderate cardiovascular protection. Increasing HDL through exercise and healthy diet enhances protection.'}`
    },
    'triglycerides': {
      whatItMeans: `Triglycerides of ${lab.value} ${lab.unit || 'mg/dL'} ${
        value >= 500 ? 'are extremely high, causing acute pancreatitis risk. Immediate treatment with fibrates or niacin needed.' :
        value >= 200 ? 'are high. With high LDL or diabetes, this significantly increases cardiovascular risk.' :
        value >= 150 ? 'are borderline high. Lifestyle modifications (weight loss, reduce refined carbs, exercise) recommended.' :
        'are normal (<150 mg/dL).'
      } Triglycerides are fats used for energy but promote atherosclerosis when elevated.`,
      possibleCauses: ['High carbohydrate intake (especially refined sugars)', 'Obesity and insulin resistance', 'Excessive alcohol consumption', 'Physical inactivity', 'Type 2 diabetes', 'Hypothyroidism', 'Chronic kidney disease', 'Genetic hyperlipidemia', 'Medications (corticosteroids, beta-blockers, thiazides, estrogen, retinoids)', 'Pregnancy'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value >= 500 ? 'severely elevated triglycerides form chylomicrons that increase blood viscosity and can obstruct pancreatic capillaries, causing acute pancreatitis—a life-threatening emergency with severe abdominal pain, vomiting, and potential multi-organ failure.' : value >= 200 ? 'high triglycerides contribute to atherosclerotic plaque formation, particularly when combined with low HDL or high LDL. They also indicate insulin resistance and metabolic syndrome. Triglyceride-rich lipoproteins penetrate arterial walls and promote inflammation. High triglycerides with diabetes or metabolic syndrome dramatically increase cardiovascular risk.' : value >= 150 ? 'borderline high triglycerides suggest excess calorie consumption and insulin resistance. They often accompany abdominal obesity, low HDL, and high blood pressure—components of metabolic syndrome. Lifestyle modifications can normalize levels.' : 'normal triglycerides indicate balanced energy metabolism and lower cardiovascular risk.'}`
    },

    // LIVER FUNCTION TESTS
    'alt': {
      whatItMeans: `ALT (SGPT) of ${lab.value} ${lab.unit || 'U/L'} is a liver-specific enzyme. ${
        value > 200 ? 'This is severely elevated, indicating ACUTE HEPATOCELLULAR INJURY. Immediate hepatology consultation required to identify cause (viral hepatitis, drug-induced, ischemia).' :
        value > 100 ? 'This is moderately elevated, indicating significant liver inflammation. Requires investigation for fatty liver disease, hepatitis, or medication effects.' :
        value > 40 ? 'This is mildly elevated. Common causes include fatty liver disease, alcohol use, or metabolic syndrome.' :
        'This is normal (<40 U/L).'
      } ALT is more specific for liver damage than AST.`,
      possibleCauses: value > 40 ? ['Non-alcoholic fatty liver disease (NAFLD/NASH) - most common', 'Viral hepatitis (Hepatitis B, C, A, E)', 'Alcohol-related liver disease', 'Drug-induced liver injury (acetaminophen, antibiotics, statins, NSAIDs)', 'Autoimmune hepatitis', 'Hemochromatosis (iron overload)', 'Wilson disease (copper overload)', 'Alpha-1 antitrypsin deficiency', 'Liver ischemia/hypoxia', 'Celiac disease'] : [],
      bodyConnection: `At ${lab.value} ${lab.unit || 'U/L'}, ${value > 200 ? 'severely elevated ALT indicates active hepatocellular necrosis—liver cells are dying and releasing ALT into bloodstream. This requires urgent investigation to prevent progression to acute liver failure, which can be fatal without transplantation. Causes include acute viral hepatitis, acetaminophen overdose, ischemic hepatitis (shock liver), or acute Budd-Chiari syndrome.' : value > 100 ? 'moderately elevated ALT indicates ongoing liver inflammation. Your liver performs 500+ vital functions: detoxification, protein synthesis (clotting factors, albumin), glucose regulation, bile production, and medication metabolism. Persistent inflammation progresses to fibrosis, cirrhosis, liver failure, and hepatocellular carcinoma. Early intervention (weight loss for fatty liver, antivirals for hepatitis) can reverse damage.' : value > 40 ? 'mildly elevated ALT suggests early liver inflammation, often from fatty liver disease related to obesity, diabetes, or metabolic syndrome. At this stage, liver damage is reversible with weight loss (5-10% body weight), exercise, and avoiding alcohol. Untreated, it may progress to cirrhosis over years.' : 'normal ALT indicates healthy liver function.'}`
    },
    'ast': {
      whatItMeans: `AST (SGOT) of ${lab.value} ${lab.unit || 'U/L'} is found in liver, heart, muscle, and kidneys. ${
        value > 200 ? 'This is severely elevated. With ALT >200, indicates acute liver damage. If AST >> ALT, consider heart attack or muscle damage.' :
        value > 100 ? 'This is moderately elevated. AST/ALT ratio helps differentiate causes: >2 suggests alcohol, <1 suggests fatty liver.' :
        value > 40 ? 'This is mildly elevated. Check AST/ALT ratio and consider liver disease, muscle damage, or heart issues.' :
        'This is normal (<40 U/L).'
      } AST is less specific than ALT but helps identify the source of injury.`,
      possibleCauses: value > 40 ? ['Liver diseases (same as ALT: fatty liver, hepatitis, cirrhosis)', 'Alcohol-related liver damage (AST often 2x ALT)', 'Heart attack (myocardial infarction)', 'Muscle damage (rhabdomyolysis from trauma, statins, intense exercise)', 'Hemolysis (RBC destruction)', 'Celiac disease', 'Hypothyroidism', 'Medications'] : [],
      bodyConnection: `At ${lab.value} ${lab.unit || 'U/L'}, ${value > 200 ? 'severely elevated AST with ALT >200 indicates massive hepatocellular necrosis. If AST is disproportionately higher than ALT (AST:ALT ratio >2), consider alcoholic hepatitis, cirrhosis, or non-hepatic causes like myocardial infarction or rhabdomyolysis. Urgent evaluation needed.' : value > 100 ? 'moderately elevated AST requires interpretation with ALT. AST/ALT ratio >2 strongly suggests alcoholic liver disease (alcohol damages mitochondria, releasing mitochondrial AST). Ratio <1 suggests non-alcoholic fatty liver disease. Both progress to cirrhosis if untreated. AST from heart (MI) or muscle (rhabdomyolysis) requires different urgent interventions.' : value > 40 ? 'mildly elevated AST may be from liver, muscle, or heart. Check CK for muscle damage, troponins for heart damage, and liver imaging for fatty liver. If isolated AST elevation, consider hemolysis or recent vigorous exercise.' : 'normal AST indicates no significant tissue damage in liver, heart, or muscle.'}`
    },

    // KIDNEY FUNCTION
    'creatinine': {
      whatItMeans: `Creatinine of ${lab.value} ${lab.unit || 'mg/dL'} measures kidney filtration function. ${
        value > 3.0 ? 'This is severely elevated, indicating advanced kidney disease (CKD Stage 4-5) or acute kidney injury. Nephrology consultation urgent.' :
        value > 1.5 ? 'This is moderately elevated, indicating kidney dysfunction (CKD Stage 3). Requires investigation and monitoring.' :
        value > 1.2 ? 'This is mildly elevated. Early kidney dysfunction, dehydration, or high muscle mass possible.' :
        'This is normal (0.6-1.2 mg/dL).'
      } Creatinine is produced by muscles and normally filtered by kidneys.`,
      possibleCauses: value > 1.2 ? ['Chronic kidney disease (diabetic nephropathy, hypertensive nephrosclerosis)', 'Acute kidney injury (dehydration, sepsis, medications)', 'Urinary obstruction (kidney stones, BPH)', 'Glomerulonephritis (autoimmune)', 'Polycystic kidney disease', 'Nephrotoxic medications (NSAIDs, contrast dye, aminoglycosides)', 'Rhabdomyolysis (muscle breakdown)', 'Heart failure (reduced kidney perfusion)'] : [],
      bodyConnection: `At ${lab.value} ${lab.unit || 'mg/dL'}, ${value > 3.0 ? 'severely elevated creatinine indicates your kidneys are functioning at <30% normal capacity. Waste products, toxins, and excess fluid accumulate, causing uremia (nausea, confusion, itching), hyperkalemia (dangerous heart rhythms), metabolic acidosis, and anemia from decreased erythropoietin. You may need dialysis preparation or kidney transplant evaluation. Complications include heart disease, bone disease, and electrolyte emergencies.' : value > 1.5 ? 'moderately elevated creatinine indicates significant kidney dysfunction. Your kidneys regulate fluid balance, blood pressure, electrolytes, acid-base balance, vitamin D activation, and red blood cell production. Impaired function causes hypertension, anemia, bone disease, and cardiovascular disease. Progression can be slowed with blood pressure control (ACE inhibitors/ARBs), diabetes management, and avoiding nephrotoxins.' : value > 1.2 ? 'mildly elevated creatinine suggests early kidney dysfunction or decreased kidney blood flow from dehydration, heart failure, or medications. Early detection allows intervention to prevent progression. Chronic kidney disease increases heart disease risk 2-3 fold.' : 'normal creatinine indicates healthy kidney filtration. Kidneys filter 180 liters of blood daily, maintaining precise fluid and electrolyte balance essential for life.'}`
    },

    // THYROID FUNCTION
    'tsh': {
      whatItMeans: `TSH of ${lab.value} ${lab.unit || 'mIU/L'} controls thyroid hormone production. ${
        value > 10 ? 'This is severely elevated, indicating hypothyroidism (underactive thyroid). Endocrinology consultation recommended.' :
        value > 4.0 ? 'This is mildly elevated, suggesting subclinical hypothyroidism. Monitor and may require treatment.' :
        value < 0.1 ? 'This is severely suppressed, indicating hyperthyroidism (overactive thyroid). Can cause heart problems.' :
        value < 0.4 ? 'This is low, suggesting mild hyperthyroidism or over-replacement with thyroid medication.' :
        'This is normal (0.4-4.0 mIU/L).'
      } TSH is the most sensitive test for thyroid function.`,
      possibleCauses: value > 4.0 ? ['Hashimoto thyroiditis (autoimmune hypothyroidism)', 'Iodine deficiency', 'Thyroid surgery or radioactive iodine treatment', 'Medications (lithium, amiodarone)', 'Pituitary tumor (rare)', 'Thyroid gland dysfunction'] : ['Graves disease (autoimmune hyperthyroidism)', 'Thyroid nodules producing excess hormone', 'Thyroiditis (temporary inflammation)', 'Excessive thyroid medication', 'Pituitary dysfunction (rare)'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'mIU/L'}, ${value > 10 ? 'severely elevated TSH means your pituitary is desperately trying to stimulate an underactive thyroid. Hypothyroidism slows your entire metabolism, causing fatigue, weight gain, depression, constipation, cold intolerance, dry skin, hair loss, muscle weakness, high cholesterol, and irregular periods. Untreated severe hypothyroidism can cause myxedema coma (life-threatening). Thyroid hormone replacement (levothyroxine) normalizes metabolism and symptoms.' : value > 4.0 ? 'mildly elevated TSH indicates early hypothyroidism. Even subclinical hypothyroidism increases cholesterol, heart disease risk, and pregnancy complications. Treatment decision depends on symptoms and antibody levels.' : value < 0.1 ? 'severely suppressed TSH indicates hyperthyroidism—your thyroid is producing too much hormone, dramatically accelerating metabolism. This causes anxiety, insomnia, rapid heartbeat, palpitations, weight loss despite increased appetite, tremors, heat intolerance, and frequent bowel movements. Untreated hyperthyroidism can cause atrial fibrillation, stroke, osteoporosis, and thyroid storm (life-threatening). Treatment includes antithyroid drugs, radioactive iodine, or surgery.' : value < 0.4 ? 'mildly suppressed TSH suggests mild thyroid overactivity. May cause subtle symptoms and long-term bone loss. Requires monitoring and possibly medication adjustment.' : 'normal TSH indicates balanced thyroid function, which regulates metabolism, energy, growth, and development.'}`
    },

    // VITAMINS
    'vitamin d': {
      whatItMeans: `Vitamin D of ${lab.value} ${lab.unit || 'ng/mL'} measures 25-hydroxyvitamin D. ${
        value < 12 ? 'This is severely deficient. Immediate high-dose supplementation (50,000 IU weekly) needed to prevent bone disease.' :
        value < 20 ? 'This is deficient. Daily supplementation (1000-2000 IU) required to restore levels.' :
        value < 30 ? 'This is insufficient. Supplementation (800-1000 IU daily) recommended for optimal health.' :
        value > 100 ? 'This is excessively high. Stop supplementation to prevent toxicity (hypercalcemia).' :
        'This is optimal (30-50 ng/mL).'
      } Vitamin D is actually a hormone regulating calcium and immune function.`,
      possibleCauses: value < 30 ? ['Limited sun exposure (office work, covering skin, sunscreen)', 'Dark skin pigmentation (requires more UV for synthesis)', 'Geographic location (high latitude, winter)', 'Aging (decreased skin synthesis)', 'Obesity (vitamin D sequestered in fat tissue)', 'Malabsorption (celiac, Crohn, gastric bypass)', 'Liver or kidney disease (impaired activation)', 'Medications (phenytoin, rifampin)'] : ['Excessive supplementation', 'Hypervitaminosis D from over-correction'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'ng/mL'}, ${value < 20 ? 'severe deficiency impairs calcium absorption, causing rickets in children (bowed legs, growth retardation) and osteomalacia in adults (bone pain, fractures). Deficiency also compromises immune function (increased infections, autoimmune diseases), increases cardiovascular disease risk, contributes to depression, causes muscle weakness and falls in elderly, and is linked to increased cancer risk. Vitamin D regulates expression of 200+ genes controlling cell growth, immune response, and inflammation.' : value < 30 ? 'insufficient vitamin D reduces calcium absorption efficiency from 30-80% to 10-15%, gradually depleting bone mineral density and increasing fracture risk. Suboptimal levels associate with increased respiratory infections, fatigue, mood disturbances, and potentially higher autoimmune disease and cancer risk. Supplementation improves bone health, immune function, and may reduce fall risk in elderly.' : value > 100 ? 'excessive vitamin D causes hypercalcemia (high blood calcium), leading to nausea, vomiting, weakness, confusion, kidney stones, and potentially kidney failure. Discontinue supplementation and monitor calcium levels.' : 'optimal vitamin D supports calcium absorption for strong bones, regulates immune system preventing infections and autoimmunity, maintains muscle strength, supports mood, and reduces cardiovascular disease risk.'}`
    },
    'b12': {
      whatItMeans: `Vitamin B12 of ${lab.value} ${lab.unit || 'pg/mL'} measures cobalamin. ${
        value < 200 ? 'This is deficient. Can cause irreversible neurological damage if untreated. Urgent B12 injections or high-dose oral supplementation needed.' :
        value < 300 ? 'This is borderline low. Supplementation recommended, especially if symptomatic.' :
        value > 1000 ? 'This is very high. Usually from supplementation; generally not harmful but stop excess intake.' :
        'This is normal (>300 pg/mL).'
      } B12 is essential for nerve function, DNA synthesis, and red blood cell formation.`,
      possibleCauses: value < 300 ? ['Pernicious anemia (autoimmune, most common)', 'Strict vegetarian/vegan diet (B12 only in animal products)', 'Malabsorption (celiac, Crohn, gastric bypass, H. pylori)', 'Medications (metformin, proton pump inhibitors, H2 blockers)', 'Aging (decreased stomach acid and intrinsic factor)', 'Tapeworm infection', 'Chronic pancreatitis or alcohol abuse'] : ['B12 supplementation', 'Liver disease releasing stored B12', 'Myeloproliferative disorders'],
      bodyConnection: `At ${lab.value} ${lab.unit || 'pg/mL'}, ${value < 200 ? 'severe B12 deficiency causes megaloblastic anemia (large, immature RBCs) with fatigue, weakness, and shortness of breath. More critically, it causes irreversible neurological damage: peripheral neuropathy (numbness, tingling in hands/feet), balance problems, memory loss, dementia, and in severe cases, subacute combined degeneration of spinal cord (paralysis). Psychiatric symptoms include depression, psychosis, and cognitive decline. Early treatment with B12 injections prevents permanent nerve damage.' : value < 300 ? 'borderline B12 deficiency may cause subtle symptoms: fatigue, weakness, difficulty concentrating, mood changes, and mild neuropathy. These progress to more severe complications if untreated. Supplementation (1000 mcg daily or injections) prevents progression and often improves symptoms.' : value > 1000 ? 'very high B12 is typically from supplementation and is not harmful. B12 is water-soluble; excess is excreted in urine. Extremely elevated levels (>2000 pg/mL) may rarely indicate liver disease, certain blood cancers, or excessive supplementation.' : 'normal B12 supports red blood cell formation, neurological function, DNA synthesis, and energy production. B12 is stored in liver, providing reserves for 2-4 years.'}`
    }
  };

  // Find matching context with priority for more specific matches
  const sortedKeys = Object.keys(contexts).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (labName.includes(key)) {
      return contexts[key];
    }
  }

  // Return specific message for completely unknown parameters
  return {
    whatItMeans: `${lab.name} is a laboratory parameter that your healthcare provider has identified as ${lab.status}. The value of ${lab.value} ${lab.unit || ''} requires professional interpretation in the context of your complete health picture.`,
    possibleCauses: ['This parameter may be affected by various medical conditions', 'Lifestyle factors including diet and exercise', 'Medications you are taking', 'Genetic predisposition', 'Recent illness or stress', 'Other underlying health conditions'],
    bodyConnection: 'This parameter provides valuable information about specific physiological processes in your body. Your healthcare provider can explain its significance and any necessary follow-up based on your individual health status and medical history.'
  };
}
