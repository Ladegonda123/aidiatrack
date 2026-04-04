/**
 * Consolidated dietary advice based on blood glucose level
 * Supports English and Kinyarwanda
 */

export const getDietAdvice = (
  bloodGlucose: number,
  language: "en" | "rw",
): string => {
  if (language === "rw") {
    return getDietAdviceKin(bloodGlucose);
  }
  return getDietAdviceEn(bloodGlucose);
};

const getDietAdviceEn = (bloodGlucose: number): string => {
  if (bloodGlucose < 70) {
    return "Your blood sugar is LOW. Eat fast-acting carbohydrates immediately: a ripe banana, fruit juice, or sugary drink. Then follow with a proper meal.";
  } else if (bloodGlucose <= 130) {
    return "Your blood sugar is in a good range. Continue with your balanced diet. Focus on beans (ibiharage), vegetables, eggs, and sweet potato. Avoid ugali and white rice in large portions.";
  } else if (bloodGlucose <= 180) {
    return "Your blood sugar is elevated. For your next meal: choose isombe, beans, or eggs. Avoid ugali, white rice, ripe bananas, and fried cassava. Drink water and take a short walk if possible.";
  } else {
    return "Your blood sugar is HIGH. Avoid all high-GI foods: ugali, white rice, ripe bananas, fried foods, and fruit juice. Eat protein (eggs, meat stew, beans) with green vegetables only. Contact your doctor if it stays this high.";
  }
};

const getDietAdviceKin = (bloodGlucose: number): string => {
  if (bloodGlucose < 70) {
    return "Isukiraguciro ryawe riri nshuro (low). Nyira vuba ibinyobwa bifite sukari: imineke izeze, umutobe, cyangwa ikinini kigira sukari. Noneho nyira iyo yanyu nziza.";
  } else if (bloodGlucose <= 130) {
    return "Isukiraguciro ryawe riri neza. Komeza kugira ibiryo bikwiye. Gumira ibiharage, imboga, amagi, n'ibijumba. Witikira ubugali n'umuceli mwekundu mu kivanyo kinini.";
  } else if (bloodGlucose <= 180) {
    return "Isukiraguciro ryawe riri hejuru. Kuri iyo yanyu iregeye: hitamo isombe, ibiharage, cyangwa amagi. Witikira ubugali, umuceli mwekundu, imineke izeze, n'imyumbati igatokowe. Nywa amazi kandi genda inzira yoroshye niba ibishoboka.";
  } else {
    return "Isukiraguciro ryawe riri hejuru cyane. Witikira ibinyobwa bic yujuje sukari: ubugali, umuceli mwekundu, imineke izeze, ibiryo bitorokoye, n'umutobe. Nyira inyama (amagi, inyama y'intamu itogwa), n'imboga zikaze gusa. Baza umuganga waho niba isukiraguciro ihagarara aho.";
  }
};
