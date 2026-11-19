// The original stage-one content. Used only by the database seed command.
const names = {
  Coffee: "Coffee spot name",
  Parties: "Party name",
  Sports: "Sports spot name",
  Events: "Event name",
};

export const sampleIdeas = ["Lagos", "Abuja"].flatMap((city) =>
  Object.entries(names).flatMap(([category, name]) =>
    [1, 2, 3].map((n) => ({
      id: `${city.toLowerCase()}-${category.toLowerCase()}-${n}`,
      city, category, title: `[${name} ${n}]`, area: "[Area]",
      priceLevel: "[Price level]", blurb: "[One-line blurb goes here]",
      seller: category === "Events" ? "Tix" : null,
      status: "Example", dateChecked: "[DATE]", source: "[Source or link]",
    })),
  ),
);

export const sampleTips = [
  { id: "t1", category: "Scams", title: "[This week's alert goes here]", body: "[Scam tip detail goes here]" },
  { id: "t2", category: "Scams", title: "[Scam tip title]", body: "[Scam tip detail goes here]" },
  { id: "t3", category: "Money", title: "[Money tip title]", body: "[Money tip detail goes here]" },
  { id: "t4", category: "Money", title: "[Money tip title]", body: "[Money tip detail goes here]" },
  { id: "t5", category: "Transport", title: "[Transport tip title]", body: "[Transport tip detail goes here]" },
  { id: "t6", category: "Transport", title: "[Transport tip title]", body: "[Transport tip detail goes here]" },
  { id: "t7", category: "Safety", title: "[Safety tip title]", body: "[Safety tip detail goes here]" },
  { id: "t8", category: "Health", title: "[Health tip title]", body: "[Health tip detail goes here]" },
];

export const samplePrices = [
  { id: "p1", label: "[Item: airport ride]", rangeText: "[PRICE]", lastChecked: "[DATE]" },
  { id: "p2", label: "[Item: short ride in town]", rangeText: "[PRICE]", lastChecked: "[DATE]" },
  { id: "p3", label: "[Item: coffee]", rangeText: "[PRICE]", lastChecked: "[DATE]" },
  { id: "p4", label: "[Item: local meal]", rangeText: "[PRICE]", lastChecked: "[DATE]" },
  { id: "p5", label: "[Item: club entry]", rangeText: "[PRICE]", lastChecked: "[DATE]" },
];
