export type QuestionItem = {
	id: number;
	question: string;
	options: string[];
	correctIndex: number;
};

export const QUESTIONS: QuestionItem[] = [
	{
		id: 1,
		question: "When driving in fog, you should use?",
		options: [
			"High-beam headlights",
			"Hazard lights",
			"Fog lights if visibility is seriously reduced",
			"No lights at all",
		],
		correctIndex: 2,
	},
	{
		id: 2,
		question: "At a stop sign, you must?",
		options: [
			"Slow down only",
			"Stop completely and check all directions",
			"Proceed if no cars are visible",
			"Stop only at night",
		],
		correctIndex: 1,
	},
	{
		id: 3,
		question: "If an emergency vehicle approaches, you should?",
		options: [
			"Speed up to get out of the way",
			"Pull over safely and stop",
			"Keep driving at the same speed",
			"Brake suddenly in your lane",
		],
		correctIndex: 1,
	},
	{
		id: 4,
		question: "On a wet road, stopping distance is?",
		options: [
			"The same as dry roads",
			"Shorter than usual",
			"Longer than usual",
			"Not affected",
		],
		correctIndex: 2,
	},
	{
		id: 5,
		question: "When turning left, you should?",
		options: [
			"Signal only after you turn",
			"Check mirrors and signal before turning",
			"Turn without signaling if no cars are near",
			"Stop in the middle of the intersection",
		],
		correctIndex: 1,
	},
	{
		id: 6,
		question: "A flashing yellow traffic light means?",
		options: [
			"Stop completely",
			"Proceed with caution",
			"Speed up",
			"Pedestrians must stop",
		],
		correctIndex: 1,
	},
	{
		id: 7,
		question: "What does a solid white line mean?",
		options: [
			"Passing is allowed",
			"Lane changes are discouraged",
			"Road is closed",
			"Turn only",
		],
		correctIndex: 1,
	},
	{
		id: 8,
		question: "You must yield to pedestrians when?",
		options: [
			"They are on a marked crossing",
			"They are waiting on the sidewalk",
			"There are no traffic lights",
			"It is daytime only",
		],
		correctIndex: 0,
	},
	{
		id: 9,
		question: "If you miss your exit on a highway, you should?",
		options: [
			"Reverse to the exit",
			"Stop and turn around",
			"Continue to the next exit",
			"Make a U-turn in the median",
		],
		correctIndex: 2,
	},
	{
		id: 10,
		question: "When should you use headlights?",
		options: [
			"Only at night",
			"From dusk until dawn",
			"Only in rain",
			"Only on highways",
		],
		correctIndex: 1,
	},
	{
		id: 11,
		question: "A broken yellow line on your side means?",
		options: [
			"No passing allowed",
			"Passing allowed if safe",
			"Passing allowed only at night",
			"Road closed ahead",
		],
		correctIndex: 1,
	},
	{
		id: 12,
		question: "What should you do when approaching a school zone?",
		options: [
			"Maintain the same speed",
			"Increase speed to clear the area",
			"Reduce speed and watch for children",
			"Use hazard lights",
		],
		correctIndex: 2,
	},
	{
		id: 13,
		question: "If your vehicle starts to skid, you should?",
		options: [
			"Brake hard immediately",
			"Steer in the direction you want to go",
			"Turn the wheel sharply the other way",
			"Accelerate",
		],
		correctIndex: 1,
	},
	{
		id: 14,
		question: "When is it legal to use a mobile phone while driving?",
		options: [
			"At traffic lights",
			"When using hands-free",
			"On empty roads",
			"When driving slowly",
		],
		correctIndex: 1,
	},
	{
		id: 15,
		question: "If traffic lights are out, you should?",
		options: [
			"Treat it as a four-way stop",
			"Proceed without stopping",
			"Wait for police to arrive",
			"Turn around",
		],
		correctIndex: 0,
	},
	{
		id: 16,
		question: "You should not pass another vehicle when?",
		options: [
			"On a straight road",
			"Approaching a hill or curve",
			"On a multi-lane road",
			"During daylight",
		],
		correctIndex: 1,
	},
	{
		id: 17,
		question: "What is the safest following distance?",
		options: [
			"One second behind",
			"Two to three seconds behind",
			"Half a car length",
			"Any distance is fine",
		],
		correctIndex: 1,
	},
	{
		id: 18,
		question: "When parking on a hill, you should?",
		options: [
			"Leave the wheels straight",
			"Turn wheels toward the curb",
			"Turn wheels away from the curb",
			"Leave the engine running",
		],
		correctIndex: 1,
	},
	{
		id: 19,
		question: "If you are tired while driving, you should?",
		options: [
			"Open the window and continue",
			"Stop and rest",
			"Drink coffee and speed up",
			"Turn on loud music",
		],
		correctIndex: 1,
	},
	{
		id: 20,
		question: "Before changing lanes, you should?",
		options: [
			"Check mirrors and blind spots",
			"Sound the horn",
			"Flash headlights",
			"Brake suddenly",
		],
		correctIndex: 0,
	},
];
