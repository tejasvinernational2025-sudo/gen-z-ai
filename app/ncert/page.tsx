"use client";

import { useState } from "react";
import Link from "next/link";

const subjects: Record<string, string[]> = {
  "6": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "7": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "8": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "9": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "10": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  "11": ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Political Science", "Economics"],
  "12": ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Political Science", "Economics"],
};

type Lesson = {
  intro: string;
  points: string[];
  examples: { question: string; solution: string }[];
  practice: { question: string; answer: string }[];
  quiz: { question: string; options: string[]; answer: number; explain: string };
};

const lessons: Record<string, Lesson> = {
  "Integers": {
    intro: "Integers are whole numbers, their negative opposites, and zero. They are useful for describing temperatures, floors below ground, gains and losses.",
    points: ["Positive integers are greater than zero: 1, 2, 3 …", "Negative integers are less than zero: −1, −2, −3 …", "Zero is neither positive nor negative.", "On a number line, numbers increase as we move to the right."],
    examples: [
      { question: "Calculate: (−3) + 7", solution: "Start at −3 on the number line and move 7 steps right. You reach 4. So, (−3) + 7 = 4." },
      { question: "Calculate: 5 − 8", solution: "Start at 5 and move 8 steps left. You reach −3. So, 5 − 8 = −3." }
    ],
    practice: [
      { question: "Which is greater: −2 or −6?", answer: "−2 is greater because it lies to the right of −6 on the number line." },
      { question: "Find (−4) + 9.", answer: "5" },
      { question: "The temperature is 3°C and falls by 7°C. What is it now?", answer: "−4°C" }
    ],
    quiz: { question: "Which number is the smallest?", options: ["−1", "0", "−5", "3"], answer: 2, explain: "−5 is farthest to the left, so it is the smallest." }
  },
  "Fractions": {
    intro: "A fraction represents equal parts of a whole. In 3/4, 3 is the numerator (selected parts) and 4 is the denominator (total equal parts).",
    points: ["The denominator cannot be zero.", "A proper fraction has numerator smaller than denominator.", "Equivalent fractions have the same value, for example 1/2 = 2/4.", "To add fractions with the same denominator, add the numerators and keep the denominator."],
    examples: [
      { question: "Add 2/7 + 3/7.", solution: "The denominators are the same. Add the numerators: (2 + 3)/7 = 5/7." },
      { question: "Find an equivalent fraction for 1/3 with denominator 12.", solution: "Multiply numerator and denominator by 4: 1/3 = 4/12." }
    ],
    practice: [
      { question: "What is the numerator in 5/8?", answer: "5" },
      { question: "Add 1/6 + 4/6.", answer: "5/6" },
      { question: "Are 2/3 and 4/6 equivalent?", answer: "Yes. 2/3 × 2/2 = 4/6." }
    ],
    quiz: { question: "Which fraction is equivalent to 1/2?", options: ["1/3", "2/4", "3/5", "2/3"], answer: 1, explain: "2/4 simplifies to 1/2 when numerator and denominator are divided by 2." }
  },
  "Decimals": {
    intro: "Decimals are another way to write parts of a whole. The first place after the decimal point is tenths; the second is hundredths.",
    points: ["In 4.7, 7 is in the tenths place.", "In 2.35, 3 is tenths and 5 is hundredths.", "Line up decimal points when adding or subtracting.", "A zero at the end does not change a decimal's value: 0.5 = 0.50."],
    examples: [
      { question: "Add 2.40 + 1.35.", solution: "Line up decimal points: 2.40 + 1.35 = 3.75." },
      { question: "Subtract 5.00 − 2.65.", solution: "Write 5.00 − 2.65. Subtract column by column to get 2.35." }
    ],
    practice: [
      { question: "What is the tenths digit in 6.28?", answer: "2" },
      { question: "Add 1.25 + 0.50.", answer: "1.75" },
      { question: "Write 7/10 as a decimal.", answer: "0.7" }
    ],
    quiz: { question: "Which is equal to 0.6?", options: ["6/100", "6/10", "60/1", "6/1000"], answer: 1, explain: "0.6 means six tenths, which is 6/10." }
  },
  "Algebra": {
    intro: "Algebra uses letters or symbols to represent numbers. A letter such as x can stand for a number we do not know yet.",
    points: ["A variable is a letter that represents a number.", "A constant is a fixed number, such as 5.", "In x + 3, x is the variable and 3 is the constant.", "An expression has numbers, variables and operations; an equation has an equals sign."],
    examples: [
      { question: "If x = 4, find x + 6.", solution: "Replace x with 4: 4 + 6 = 10." },
      { question: "A number n is 5 more than 8. Write the expression and find it.", solution: "The expression is 8 + 5. Its value is 13." }
    ],
    practice: [
      { question: "In 3 + y, which is the variable?", answer: "y" },
      { question: "Find a + 2 when a = 7.", answer: "9" },
      { question: "Write 'a number p decreased by 4' as an expression.", answer: "p − 4" }
    ],
    quiz: { question: "If m = 5, what is 2m?", options: ["7", "10", "25", "52"], answer: 1, explain: "2m means 2 × m. So 2 × 5 = 10." }
  },
  "Ratio and Proportion": {
    intro: "A ratio compares two quantities of the same kind. A proportion says that two ratios are equal.",
    points: ["The ratio 2:3 is read as '2 to 3'.", "Divide both parts of a ratio by the same non-zero number to simplify it.", "A proportion such as 2:3 = 4:6 shows equal ratios.", "Compare quantities in the same units before writing a ratio."],
    examples: [
      { question: "Simplify 6:9.", solution: "Divide both terms by 3. The simplest ratio is 2:3." },
      { question: "Are 1:2 and 3:6 in proportion?", solution: "Yes. 3:6 simplifies to 1:2, so the ratios are equal." }
    ],
    practice: [
      { question: "Simplify 8:12.", answer: "2:3" },
      { question: "Write the ratio of 4 red balls to 5 blue balls.", answer: "4:5" },
      { question: "Are 2:5 and 4:10 equivalent ratios?", answer: "Yes. 4:10 simplifies to 2:5." }
    ],
    quiz: { question: "What is the simplest form of 10:15?", options: ["1:5", "2:3", "3:2", "5:10"], answer: 1, explain: "Divide both terms by their common factor 5 to get 2:3." }
  },
  "Symmetry": {
    intro: "A shape has line symmetry if one half is the mirror image of the other half when folded along a line.",
    points: ["The fold line is called the line of symmetry.", "Some shapes have one line of symmetry; others have more than one.", "A square has 4 lines of symmetry.", "A non-symmetrical shape has no line of symmetry."],
    examples: [
      { question: "How many lines of symmetry does a square have?", solution: "A square has 4: two lines through the midpoints of opposite sides and two diagonals." },
      { question: "Does a non-square rectangle have line symmetry?", solution: "Yes. It has 2 lines of symmetry through the midpoints of opposite sides." }
    ],
    practice: [
      { question: "How many lines of symmetry does an equilateral triangle have?", answer: "3" },
      { question: "How many lines of symmetry does a circle have?", answer: "Infinitely many" },
      { question: "What do we call the line along which a shape folds into matching halves?", answer: "Line of symmetry" }
    ],
    quiz: { question: "How many lines of symmetry does a square have?", options: ["1", "2", "3", "4"], answer: 3, explain: "A square has four lines of symmetry." }
  },
  "Data Handling": {
    intro: "Data handling means collecting, organising and understanding information. Tables and graphs help us see patterns quickly.",
    points: ["A tally mark is used to count items quickly.", "A frequency tells how many times a value occurs.", "A pictograph uses pictures or symbols to show data.", "A bar graph compares categories using bars of equal width."],
    examples: [
      { question: "Scores are 2, 3, 3, 4, 3. What is the frequency of 3?", solution: "The number 3 appears three times, so its frequency is 3." },
      { question: "A pictograph uses one star for 2 students. What do 4 stars represent?", solution: "4 × 2 = 8 students." }
    ],
    practice: [
      { question: "Find the frequency of 5 in: 5, 2, 5, 3, 5, 4.", answer: "3" },
      { question: "If one symbol represents 5 books, what do 3 symbols represent?", answer: "15 books" },
      { question: "Which graph is useful for comparing categories?", answer: "Bar graph" }
    ],
    quiz: { question: "A symbol represents 4 students. What do 5 such symbols represent?", options: ["9", "16", "20", "25"], answer: 2, explain: "5 symbols × 4 students = 20 students." }
  },
  "Mensuration": {
    intro: "Mensuration is the measurement of lengths, perimeters and areas of shapes. Perimeter measures the boundary; area measures the surface covered.",
    points: ["Perimeter is measured in units such as cm or m.", "Area is measured in square units such as cm² or m².", "Perimeter of a rectangle = 2 × (length + breadth).", "Area of a rectangle = length × breadth; area of a square = side × side."],
    examples: [
      { question: "A rectangle is 6 cm long and 4 cm wide. Find its perimeter.", solution: "Perimeter = 2 × (6 + 4) = 2 × 10 = 20 cm." },
      { question: "Find the area of a square with side 5 cm.", solution: "Area = side × side = 5 × 5 = 25 cm²." }
    ],
    practice: [
      { question: "Find the perimeter of a square of side 3 cm.", answer: "4 × 3 = 12 cm" },
      { question: "Find the area of a rectangle 7 cm by 2 cm.", answer: "7 × 2 = 14 cm²" },
      { question: "Which is measured in square units: perimeter or area?", answer: "Area" }
    ],
    quiz: { question: "What is the area of a rectangle 8 cm long and 3 cm wide?", options: ["11 cm²", "22 cm", "24 cm²", "24 cm"], answer: 2, explain: "Area = length × breadth = 8 × 3 = 24 cm²." }
  }
};


const scienceLessons: Record<string, Lesson> = {
  "Food: Where Does It Come From": {
    intro: "We get food from plants and animals. Different parts of plants and different animals provide ingredients for our meals.",
    points: ["Plants give us fruits, vegetables, grains, pulses, oils and spices.", "Animals provide milk, eggs, meat and other food products.", "Herbivores eat plants, carnivores eat other animals, and omnivores eat both.", "An ingredient is a material used to prepare a dish."],
    examples: [
      { question: "Name two plant sources and two animal sources of food.", solution: "Plant sources: wheat and spinach. Animal sources: milk and eggs." },
      { question: "A cow eats grass. What type of animal is it?", solution: "A cow is a herbivore because it eats plants." }
    ],
    practice: [
      { question: "Which part of the mustard plant gives us oil?", answer: "Seeds." },
      { question: "Is a bear generally a herbivore, carnivore or omnivore?", answer: "Omnivore; it eats both plant and animal food." },
      { question: "Name one food item obtained from animals.", answer: "Milk, eggs, honey or meat." }
    ],
    quiz: { question: "Which of these is obtained from a plant?", options: ["Milk", "Honey", "Wheat", "Egg"], answer: 2, explain: "Wheat is a grain obtained from the wheat plant." }
  },
  "Components of Food": {
    intro: "Food contains nutrients that help our body grow, provide energy and stay healthy. A balanced diet contains the nutrients our body needs in suitable amounts.",
    points: ["Carbohydrates and fats are major energy-giving nutrients.", "Proteins help growth and repair of the body.", "Vitamins and minerals protect us and keep the body working well.", "Roughage and water are also important for good health.", "A balanced diet includes a variety of foods."],
    examples: [
      { question: "Why do we need proteins?", solution: "Proteins help the body grow and repair worn-out tissues." },
      { question: "Why should we eat fruits and vegetables?", solution: "They provide vitamins, minerals, fibre and water that support good health." }
    ],
    practice: [
      { question: "Which nutrient is mainly needed for growth and repair?", answer: "Proteins." },
      { question: "Name one energy-giving nutrient.", answer: "Carbohydrates or fats." },
      { question: "What is a balanced diet?", answer: "A diet containing all essential nutrients, roughage and water in suitable amounts." }
    ],
    quiz: { question: "Which nutrient helps in growth and repair?", options: ["Protein", "Water only", "Roughage", "Salt"], answer: 0, explain: "Proteins are needed for growth and repair of body tissues." }
  },
  "Fibre to Fabric": {
    intro: "Clothes are made from fabrics, and fabrics are made from fibres. Fibres may come from plants, animals or be made artificially.",
    points: ["Cotton and jute are plant fibres.", "Wool is obtained from the fleece of sheep and some other animals.", "Silk fibre is obtained from silkworm cocoons.", "Spinning converts fibres into yarn; weaving or knitting makes fabric from yarn."],
    examples: [
      { question: "How is cotton yarn made?", solution: "Cotton fibres are separated and twisted together by spinning to make yarn." },
      { question: "What is the difference between weaving and knitting?", solution: "Weaving interlaces two sets of yarn; knitting uses loops of yarn." }
    ],
    practice: [
      { question: "Name one plant fibre.", answer: "Cotton or jute." },
      { question: "From which insect do we get silk?", answer: "Silkworm." },
      { question: "What is spinning?", answer: "The process of making yarn from fibres." }
    ],
    quiz: { question: "Which of these is an animal fibre?", options: ["Jute", "Cotton", "Wool", "Flax"], answer: 2, explain: "Wool is obtained from the fleece of sheep and certain other animals." }
  },
  "Sorting Materials and Groups": {
    intro: "We group materials by observing their properties. Sorting makes it easier to study materials and choose the right one for a particular use.",
    points: ["Materials may be grouped by appearance, hardness, solubility and other properties.", "Some materials are lustrous (shiny), while others are non-lustrous.", "Some substances dissolve in water; others do not.", "Transparent materials allow light to pass through clearly; opaque materials do not."],
    examples: [
      { question: "Why is glass used for many window panes?", solution: "Ordinary clear glass is transparent, so it lets light pass through and allows us to see outside." },
      { question: "Classify sugar and sand by their behaviour in water.", solution: "Sugar dissolves in water; sand does not dissolve." }
    ],
    practice: [
      { question: "What do we call materials that allow us to see clearly through them?", answer: "Transparent materials." },
      { question: "Is a wooden block generally transparent or opaque?", answer: "Opaque." },
      { question: "Name one substance that dissolves in water.", answer: "Salt or sugar." }
    ],
    quiz: { question: "Which material is usually soluble in water?", options: ["Sand", "Sugar", "Sawdust", "Chalk powder"], answer: 1, explain: "Sugar dissolves in water and forms a solution." }
  },
  "Separation of Substances": {
    intro: "We separate substances to remove unwanted materials or to obtain useful components of a mixture. Different methods are chosen for different mixtures.",
    points: ["Handpicking removes visible unwanted components.", "Winnowing uses moving air to separate lighter and heavier components.", "Sieving separates particles of different sizes.", "Filtration separates an insoluble solid from a liquid.", "Evaporation can recover a dissolved solid from a solution."],
    examples: [
      { question: "How can stones be removed from rice?", solution: "By handpicking, because the stones can be seen and picked out." },
      { question: "How can sand be separated from water?", solution: "Allow the sand to settle and carefully pour off the water, or use filtration." }
    ],
    practice: [
      { question: "Which method separates bran from flour?", answer: "Sieving." },
      { question: "Which method is used to separate grain from husk using wind?", answer: "Winnowing." },
      { question: "How can salt be obtained from salt water?", answer: "By evaporation of the water." }
    ],
    quiz: { question: "Which method is suitable for separating tea leaves from tea?", options: ["Winnowing", "Filtration/straining", "Handpicking", "Threshing"], answer: 1, explain: "A strainer acts as a filter and holds back the tea leaves." }
  },
  "Changes Around Us": {
    intro: "We observe many changes around us. Some changes can be reversed, while others cannot be easily reversed.",
    points: ["Melting ice is reversible because water can be frozen again.", "Burning paper is irreversible; the original paper cannot be obtained back easily.", "Heating and cooling can cause changes in size or state.", "Some changes are slow, while others happen quickly."],
    examples: [
      { question: "Is folding a sheet of paper reversible?", solution: "Usually yes. The sheet can be unfolded, although creases may remain." },
      { question: "Is cooking an egg reversible?", solution: "No. Cooking causes an irreversible change; a cooked egg cannot be changed back into a raw egg." }
    ],
    practice: [
      { question: "Give one example of a reversible change.", answer: "Melting and freezing of ice, or stretching a spring within its limit." },
      { question: "Is burning wood reversible?", answer: "No, it is irreversible." },
      { question: "What happens to many materials when heated?", answer: "They may expand or change state; the exact change depends on the material." }
    ],
    quiz: { question: "Which is an irreversible change?", options: ["Freezing water", "Melting wax", "Burning a matchstick", "Folding a cloth"], answer: 2, explain: "Burning a matchstick produces new substances and cannot be reversed." }
  },
  "Getting to Know Plants": {
    intro: "Plants have different parts that perform different functions. Roots, stems, leaves, flowers and fruits help a plant survive and reproduce.",
    points: ["Roots usually anchor the plant and absorb water and minerals.", "The stem supports the plant and transports water and food.", "Leaves make food by photosynthesis.", "Flowers are involved in reproduction and may develop into fruits and seeds.", "Plants may have taproots or fibrous roots."],
    examples: [
      { question: "What is the main function of roots?", solution: "Roots anchor the plant and absorb water and minerals from the soil." },
      { question: "Why are leaves often called the food factories of plants?", solution: "Leaves prepare food by photosynthesis using sunlight, water and carbon dioxide." }
    ],
    practice: [
      { question: "Which part usually absorbs water from soil?", answer: "Roots." },
      { question: "Name the green pigment in leaves.", answer: "Chlorophyll." },
      { question: "What may develop into a fruit after fertilisation?", answer: "The ovary of a flower." }
    ],
    quiz: { question: "Which part of a plant mainly prepares food?", options: ["Root", "Leaf", "Flower stalk", "Seed coat"], answer: 1, explain: "Leaves contain chlorophyll and usually carry out photosynthesis." }
  },
  "Body Movements": {
    intro: "Our body moves with the help of bones, muscles and joints. Different joints allow different kinds of movement.",
    points: ["The human skeleton supports the body and protects many organs.", "A joint is where two or more bones meet.", "A hinge joint allows movement mainly in one direction, like the elbow.", "A ball-and-socket joint allows movement in many directions, like the shoulder.", "Muscles work by contracting and relaxing."],
    examples: [
      { question: "Why can the elbow bend but not rotate freely in every direction?", solution: "The elbow is a hinge joint, which mainly allows back-and-forth movement in one plane." },
      { question: "How do muscles help move bones?", solution: "Muscles are attached to bones and pull them when they contract. Many muscles work in pairs." }
    ],
    practice: [
      { question: "Which system gives the body its framework?", answer: "The skeletal system." },
      { question: "Name the joint found at the shoulder.", answer: "Ball-and-socket joint." },
      { question: "Do muscles push or pull bones?", answer: "Muscles pull bones when they contract." }
    ],
    quiz: { question: "Which joint allows movement in many directions?", options: ["Hinge", "Fixed", "Ball-and-socket", "Gliding only"], answer: 2, explain: "A ball-and-socket joint, such as the shoulder joint, allows movement in many directions." }
  },
  "The Living Organisms and Their Surroundings": {
    intro: "Living organisms interact with their surroundings, called habitats. Organisms have features that help them survive in their habitats.",
    points: ["A habitat is the place where an organism lives.", "Terrestrial habitats are on land; aquatic habitats are in water.", "Living things need food, water and air and show life processes.", "Adaptations are features that help organisms survive in particular surroundings.", "Plants and animals respond to changes around them."],
    examples: [
      { question: "Why does a fish have a streamlined body?", solution: "Its streamlined body helps it move through water with less resistance." },
      { question: "What is a habitat? Give an example.", solution: "A habitat is the natural home of an organism. A pond is a habitat for fish and aquatic plants." }
    ],
    practice: [
      { question: "What is a habitat?", answer: "The natural place or surroundings where an organism lives." },
      { question: "Is a camel adapted to desert or polar conditions?", answer: "Desert conditions." },
      { question: "Name one aquatic habitat.", answer: "Pond, lake, river or sea." }
    ],
    quiz: { question: "Which feature helps a fish swim efficiently?", options: ["Wings", "Streamlined body", "Thick fur", "Long legs"], answer: 1, explain: "A streamlined body reduces resistance as the fish moves through water." }
  },
  "Motion and Measurement of Distance": {
    intro: "We measure distance to describe how far apart places or objects are. Motion describes a change in an object's position with time.",
    points: ["The SI unit of length is the metre (m).", "A ruler or measuring tape can measure length.", "Use a suitable standard unit and place the scale correctly.", "An object is in motion if its position changes with time relative to a reference point.", "Motion may be rectilinear, circular or periodic."],
    examples: [
      { question: "Convert 250 cm into metres.", solution: "100 cm = 1 m, so 250 cm = 250 ÷ 100 = 2.5 m." },
      { question: "A child moves around a circular track. What type of path is followed?", solution: "The child follows a circular path, so this is circular motion." }
    ],
    practice: [
      { question: "What is the SI unit of length?", answer: "Metre (m)." },
      { question: "Convert 3 m into centimetres.", answer: "300 cm." },
      { question: "What type of motion does a swinging pendulum show approximately?", answer: "Periodic motion." }
    ],
    quiz: { question: "How many centimetres are there in 1 metre?", options: ["10", "100", "1,000", "1"], answer: 1, explain: "One metre is equal to 100 centimetres." }
  }
};
Object.assign(scienceLessons, {
  "Light": {
    intro: "Light helps us see objects. It usually travels in straight lines.",
    points: ["Luminous objects produce light; non-luminous objects reflect light.","Opaque objects block light and can form shadows.","Transparent objects let most light pass through.","A shadow needs a light source, an opaque object and a screen."],
    examples: [{ question: "Why is a shadow formed?", solution: "An opaque object blocks light travelling in a straight line." }],
    practice: [{ question: "Can we see through clear glass?", answer: "Yes, because it is transparent." }],
    quiz: { question: "Which material makes a clear shadow?", options: ["Clear glass","Opaque cardboard","Clean water","Air"], answer: 1, explain: "Opaque cardboard blocks light and creates a shadow." }
  },
  "Electricity and Circuits": {
    intro: "A simple electric circuit allows electric current to flow through a closed conducting path.",
    points: ["A cell supplies electrical energy.","A closed circuit lets a bulb glow.","An open switch breaks the circuit.","Metals are usually conductors; rubber and plastic are insulators."],
    examples: [{ question: "Why does a bulb not glow with an open switch?", solution: "The circuit is broken, so current cannot flow." }],
    practice: [{ question: "Name a conductor.", answer: "Copper or aluminium." }],
    quiz: { question: "When does a bulb glow?", options: ["Open circuit","Broken wire","Closed circuit","No cell"], answer: 2, explain: "A complete closed circuit allows current to flow." }
  },
  "Fun with Magnets": {
    intro: "Magnets attract some materials and have north and south poles.",
    points: ["Iron is attracted to a magnet.","Like magnetic poles repel and unlike poles attract.","A freely suspended magnet aligns roughly north–south.","Magnetic force can act without touching."],
    examples: [{ question: "What happens when two north poles meet?", solution: "They repel each other." }],
    practice: [{ question: "Name a magnetic material.", answer: "Iron." }],
    quiz: { question: "Which poles attract?", options: ["North–north","South–south","North–south","None"], answer: 2, explain: "Unlike magnetic poles attract each other." }
  },
  "Water": {
    intro: "Water is essential for living things and changes between solid, liquid and gas.",
    points: ["Evaporation changes liquid water into water vapour.","Condensation changes vapour into liquid water.","Freezing changes water into ice.","The water cycle involves evaporation, condensation and precipitation."],
    examples: [{ question: "What forms droplets on a cold glass?", solution: "Water vapour in air condenses on the cold surface." }],
    practice: [{ question: "What is evaporation?", answer: "Liquid water changing into water vapour." }],
    quiz: { question: "Which process makes clouds?", options: ["Freezing","Condensation","Melting","Filtering"], answer: 1, explain: "Cooling water vapour condenses into tiny droplets." }
  },
  "Air Around Us": {
    intro: "Air is a mixture of gases that surrounds Earth.",
    points: ["Nitrogen makes up most of the air.","Oxygen supports respiration and burning.","Air occupies space and has mass.","Moving air is called wind."],
    examples: [{ question: "Why does an inverted empty glass resist water entering?", solution: "The glass contains air, which occupies space." }],
    practice: [{ question: "Which gas do humans need for breathing?", answer: "Oxygen." }],
    quiz: { question: "Which gas is most abundant in air?", options: ["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"], answer: 1, explain: "Nitrogen is the largest component of air." }
  },
  "Garbage In, Garbage Out": {
    intro: "Waste management means reducing, reusing, recycling and disposing of waste responsibly.",
    points: ["Biodegradable waste can decompose naturally.","Plastic and glass often require separate recycling.","Composting turns organic waste into manure.","Separating wet and dry waste helps safe processing."],
    examples: [{ question: "What can be composted?", solution: "Vegetable peels, leaves and other suitable organic waste." }],
    practice: [{ question: "Why separate waste?", answer: "Different materials need different treatment or recycling." }],
    quiz: { question: "Which is suitable for composting?", options: ["Plastic wrapper","Glass bottle","Vegetable peels","Metal can"], answer: 2, explain: "Vegetable peels biodegrade and can be composted." }
  }
});

const classSixEnglishBooks: Record<string, string[]> = {
  "Honeysuckle": ["Taro’s Reward", "The Quarrel", "An Indian-American Woman in Space: Kalpana Chawla", "A Different Kind of School", "Where Do All the Teachers Go?", "The Wonderful Words", "A Game of Chance", "Desert Animals", "The Banyan Tree"],
  "A Pact with the Sun": ["A Tale of Two Birds", "The Friendly Mongoose", "The Shepherd’s Treasure", "Tansen", "The Monkey and the Crocodile", "The Wonder Called Sleep", "A Pact with the Sun"]
};
const classSixEnglishChapters = Object.entries(classSixEnglishBooks).flatMap(([book, chapters]) => chapters.map(chapter => ({book, chapter})));
const classSevenLegacyMaths = ["Integers","Fractions and Decimals","Data Handling","Simple Equations","Lines and Angles","The Triangle and Its Properties","Comparing Quantities","Rational Numbers","Perimeter and Area","Algebraic Expressions","Exponents and Powers","Symmetry"];
const classSixScienceUnits = Object.keys(scienceLessons);

const classSixMathTopics = Object.keys(lessons);
const fieldStyle = { width: "100%", padding: 13, borderRadius: 10, border: "1px solid #b7c7e8", fontSize: 16, background: "#fff" };

export default function NCERTPage() {
  const [schoolClass, setSchoolClass] = useState("10");
  const [subject, setSubject] = useState("Science");
  const [chapter, setChapter] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const isClassSixMaths = schoolClass === "6" && subject === "Mathematics";
  const isClassSixScience = schoolClass === "6" && subject === "Science";
  const isClassSixEnglish = schoolClass === "6" && subject === "English";
  const isClassSevenMaths = schoolClass === "7" && subject === "Mathematics";
  const isClassSixLesson = isClassSixMaths || isClassSixScience || isClassSixEnglish || isClassSevenMaths;
  const activeUnits = isClassSixMaths ? classSixMathTopics : isClassSixScience ? classSixScienceUnits : isClassSixEnglish ? classSixEnglishChapters.map(item => item.chapter) : classSevenLegacyMaths;
  const lesson = chapter ? (isClassSixMaths ? lessons[chapter] : isClassSixScience ? scienceLessons[chapter] : undefined) : undefined;
  const prompt = `I am studying Class ${schoolClass} ${subject}. ${chapter.trim() ? `Teach me the topic/chapter "${chapter.trim()}"` : "Help me choose and understand a topic"} in simple, age-appropriate language. Include a clear concept explanation, step-by-step solved examples, 5 practice questions with answers, and a short MCQ quiz. For mathematics, show every calculation step. Align the explanation with the student's school/NCERT level, but do not invent textbook wording or claim a topic is in a particular NCERT edition unless verified. If you are unsure about the textbook edition or chapter contents, say so.`;

  function changeClass(next: string) {
    setSchoolClass(next);
    setSubject(subjects[next][0]);
    setChapter("");
    setCopied(false);
    setShowAnswers(false);
    setQuizChoice(null);
  }

  function changeTopic(next: string) {
    setChapter(next);
    setShowAnswers(false);
    setQuizChoice(null);
    setCopied(false);
  }

  return <main style={{maxWidth:840,margin:"auto",padding:"24px 18px",fontFamily:"system-ui,sans-serif",color:"#162849"}}>
    <Link href="/">← Gen-Z AI Home</Link>
    <header style={{margin:"28px 0 20px"}}>
      <h1 style={{fontSize:"clamp(28px,5vw,42px)",marginBottom:8}}>📚 NCERT Study Guide</h1>
      <p>अपनी Class, Subject और Chapter चुनें। फिर आसान Explanation, solved examples और practice करें।</p>
    </header>
    <section style={{background:"#eef3ff",borderRadius:18,padding:20,display:"grid",gap:15}}>
      <label style={{display:"grid",gap:7,fontWeight:700}}>1. Select Class
        <select value={schoolClass} onChange={e=>changeClass(e.target.value)} style={fieldStyle}>
          {Object.keys(subjects).map(c=><option key={c} value={c}>Class {c}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:7,fontWeight:700}}>2. Select Subject
        <select value={subject} onChange={e=>{setSubject(e.target.value);setChapter("");setCopied(false);setShowAnswers(false);setQuizChoice(null);}} style={fieldStyle}>
          {subjects[schoolClass].map(s=><option key={s}>{s}</option>)}
        </select>
      </label>
      <label style={{display:"grid",gap:7,fontWeight:700}}>3. {isClassSixLesson ? `Select Class 6 ${subject} Unit` : "Enter Chapter Name"}
        {isClassSixLesson ? (
          <select value={chapter} onChange={e=>changeTopic(e.target.value)} style={fieldStyle}>
            <option value="">Choose a {subject} unit</option>
            {activeUnits.map(topic=><option key={topic} value={topic}>{isClassSixEnglish ? `${classSixEnglishChapters.find(item=>item.chapter===topic)?.book} — ${topic}` : topic}</option>)}
          </select>
        ) : (
          <input value={chapter} onChange={e=>{setChapter(e.target.value);setCopied(false);}} placeholder="Example: Electricity" style={fieldStyle} />
        )}
      </label>
      {isClassSixLesson && (
        <div style={{background:"#fff",borderRadius:12,padding:14}}>
          <strong>Class 6 {subject} learning units</strong>
          <ol style={{margin:"10px 0 0",paddingLeft:22,lineHeight:1.8}}>
            {activeUnits.map(topic=><li key={topic}>{isClassSixEnglish ? `${classSixEnglishChapters.find(item=>item.chapter===topic)?.book}: ${topic}` : topic}</li>)}
          </ol>
        </div>
      )}
      {lesson && (
        <section style={{background:"#fff",borderRadius:14,padding:16,display:"grid",gap:14}}>
          <div>
            <p style={{margin:"0 0 5px",fontSize:12,fontWeight:800,color:"#3157bd",letterSpacing:".05em"}}>CLASS 6 • {subject.toUpperCase()}</p>
            <h2 style={{margin:"0 0 8px",fontSize:25}}>{chapter}</h2>
            <p style={{margin:0,lineHeight:1.7}}>{lesson.intro}</p>
          </div>
          <div>
            <h3 style={{margin:"0 0 8px"}}>Key points to remember</h3>
            <ul style={{margin:0,paddingLeft:22,lineHeight:1.8}}>{lesson.points.map((point,i)=><li key={i}>{point}</li>)}</ul>
          </div>
          <div>
            <h3 style={{margin:"0 0 8px"}}>Step-by-step solved examples</h3>
            {lesson.examples.map((example,i)=><div key={i} style={{background:"#f3f6ff",padding:12,borderRadius:10,marginTop:9}}>
              <strong>Example {i+1}: {example.question}</strong>
              <p style={{margin:"7px 0 0",lineHeight:1.65}}>{example.solution}</p>
            </div>)}
          </div>
          <div>
            <h3 style={{margin:"0 0 8px"}}>Practice questions</h3>
            <ol style={{margin:0,paddingLeft:22,lineHeight:1.8}}>
              {lesson.practice.map((item,i)=><li key={i} style={{paddingBottom:7}}>{item.question}</li>)}
            </ol>
            <button type="button" onClick={()=>setShowAnswers(v=>!v)} style={{padding:"11px 14px",background:"#e7edff",color:"#173b9a",border:0,borderRadius:9,fontWeight:800}}>{showAnswers?"Hide answers":"Show answers"}</button>
            {showAnswers && <ol style={{margin:"10px 0 0",paddingLeft:22,lineHeight:1.8}}>{lesson.practice.map((item,i)=><li key={i} style={{paddingBottom:7}}><strong>{item.answer}</strong></li>)}</ol>}
          </div>
          {isClassSixLesson && <Link href={`/?studyClass=6&studySubject=${encodeURIComponent(subject)}&studyTopic=${encodeURIComponent(chapter)}#study-workspace`} style={{display:"block",padding:14,borderRadius:10,background:"#173b9a",color:"white",textAlign:"center",fontWeight:800,textDecoration:"none"}}>Start full adaptive quiz & save progress →</Link>}
          <div style={{borderTop:"1px solid #e0e7f5",paddingTop:14}}>
            <h3 style={{margin:"0 0 8px"}}>Quick chapter test</h3>
            <p style={{fontWeight:700,lineHeight:1.5}}>{lesson.quiz.question}</p>
            <div style={{display:"grid",gap:8}}>
              {lesson.quiz.options.map((option,i)=><button key={i} type="button" onClick={()=>setQuizChoice(i)} style={{textAlign:"left",padding:12,borderRadius:9,border:quizChoice===i?"2px solid #3157bd":"1px solid #cbd5e8",background:quizChoice===i?"#edf2ff":"#fff",fontSize:15}}>{String.fromCharCode(65+i)}. {option}</button>)}
            </div>
            {quizChoice!==null && <div style={{marginTop:10,padding:12,borderRadius:9,background:quizChoice===lesson.quiz.answer?"#e8f7ed":"#fff3e8",lineHeight:1.6}}>
              <strong>{quizChoice===lesson.quiz.answer?"Correct! Well done.":"Not quite. Try again after reading the explanation."}</strong>
              <p style={{margin:"5px 0 0"}}>{lesson.quiz.explain}</p>
            </div>}
            <button type="button" onClick={()=>setQuizChoice(null)} style={{marginTop:10,padding:"10px 13px",background:"#f0f2f7",border:0,borderRadius:9,fontWeight:700}}>Reset test</button>
          </div>
        </section>
      )}
      <div style={{background:"white",borderRadius:12,padding:14}}>
        <strong>Your AI Study Question</strong>
        <p style={{lineHeight:1.65,overflowWrap:"anywhere"}}>{prompt}</p>
        <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(prompt);setCopied(true);}catch{setCopied(false);}}} style={{padding:"12px 16px",background:"#234cce",color:"white",border:0,borderRadius:10,fontWeight:700,cursor:"pointer"}}>{copied?"✓ Copied":"Copy Question"}</button>
      </div>
      <Link href="/#study-workspace" style={{padding:14,borderRadius:10,background:"#132e74",color:"white",textAlign:"center",fontWeight:800,textDecoration:"none"}}>Open AI Tutor →</Link>
      <p style={{margin:0,fontSize:13}}>AI Tutor से और सवाल पूछने के लिए Question Copy करके Chat Box में Paste करें।</p>
    </section>
    <section style={{marginTop:22,lineHeight:1.7}}>
      <h2>Textbook reference</h2>
      <p>ये Gen-Z AI के Class 6 {subject} learning units हैं, जो आपके साझा किए गए syllabus के आधार पर तैयार किए गए हैं। अलग-अलग बोर्ड और NCERT editions में chapter names या क्रम बदल सकते हैं। अपनी किताब से मिलान करें।</p>
      <a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener noreferrer">Official NCERT Textbooks ↗</a>
      <p><Link href="/mock-tests">Try starter practice tests →</Link></p>
    </section>
  </main>;
}
