const salesData = {
  "In Funnel": [
    { name: "Coca cola", details: "2 Phased pitch sent | Closed, lost opportunity", status: "Closed, lost", updatedZoho: "Yes", converted: "No", reason: "Budget/Internal priority" },
    { name: "Fyntune Solution", details: "Sandbox access given. Continuous communication...", status: "No response", updatedZoho: "Yes", converted: "No", reason: "No response after sandbox" },
    { name: "American Express", details: "PPT Deck shared with responses", status: "In Progress", updatedZoho: "Yes", converted: "Maybe", reason: "Evaluating deck" },
    { name: "Sutherland", details: "Initial call done", status: "In Funnel", updatedZoho: "No", converted: "Maybe", reason: "Needs follow up" },
    { name: "Standard Chartered", details: "Demo scheduled", status: "Demo", updatedZoho: "Yes", converted: "Maybe", reason: "Demo pending" }
  ],
  "Re-emails (Nov-Jan)": [
    { name: "Sanjay Sivam", date: "01/11/2024", category: "Future Options", status: "In Progress", reason: "Looking for whitelabeling" },
    { name: "guru makam", date: "02/11/2024", category: "Irrelevant", status: "Closed", reason: "Went with competitor" },
    { name: "Surendran Ramasamy", date: "05/11/2024", category: "In funnel", status: "In Funnel", reason: "Currently evaluating others" }
  ],
  "Closed Lost": [
    { name: "BCG KYC Sep 25", account: "BCG", date: "2025-09-11", status: "Lost", reason: "Inbound-Demo Booked but no follow up" },
    { name: "Manish Partial Submission", account: "Manish enterprises", date: "2025-09-10", status: "Lost", reason: "Incomplete submission" },
    { name: "Radical minds PO Sep 25", account: "Radical Minds", date: "2025-10-11", status: "Lost", reason: "PO delay/Cancelled" }
  ],
  "Monthly Status": [
    { name: "Pal", date: "01/12/2024", status: "Closed- no response" },
    { name: "Pratik Patil", date: "02/12/2024", status: "Call- 29th dec (Did not join)" },
    { name: "Vadim", date: "03/12/2024", status: "Closed- no response" }
  ],
  "Metrics": {
    "Total Leads": 125,
    "In Funnel": 45,
    "Converted": 12,
    "Lost": 28,
    "Conversion Rate": "9.6%"
  },
  "Ratio": {
    "MQL": [12, 15, 18, 22, 25],
    "Demo": [4, 6, 8, 10, 12],
    "Won": [1, 2, 3, 2, 4]
  }
};

export default salesData;
