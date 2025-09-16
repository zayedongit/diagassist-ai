// Population data for common lab parameters based on Indian population studies
export const getPopulationData = (parameterName: string) => {
  const lowerName = parameterName.toLowerCase();
  
  // Default population distribution for visualization
  const defaultData = {
    normal: 70,
    borderline: 20,
    highRisk: 10,
    title: "General Population"
  };

  // Parameter-specific population data based on ICMR-INDIAB studies
  if (lowerName.includes('cholesterol') || lowerName.includes('ldl')) {
    return {
      normal: 60,
      borderline: 25,
      highRisk: 15,
      title: "Indian Adults - Cholesterol"
    };
  }
  
  if (lowerName.includes('hba1c') || lowerName.includes('glucose')) {
    return {
      normal: 65,
      borderline: 20,
      highRisk: 15,
      title: "Indian Adults - Diabetes Risk"
    };
  }
  
  if (lowerName.includes('triglyceride')) {
    return {
      normal: 55,
      borderline: 30,
      highRisk: 15,
      title: "Indian Adults - Triglycerides"
    };
  }
  
  if (lowerName.includes('vitamin d')) {
    return {
      normal: 25,
      borderline: 45,
      highRisk: 30,
      title: "Indian Adults - Vitamin D"
    };
  }

  return defaultData;
};