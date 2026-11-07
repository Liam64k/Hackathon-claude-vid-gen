// Word pools for the "What-if dice". Safe for all ages; fiction only.

export const SPARK = {
  scenario: [
    "Zombie outbreak in the suburbs",
    "Nuclear war and a fallout shelter",
    "Citywide blackout in August",
    "Flash flood after midnight",
    "Wildfire at the edge of town",
    "Major earthquake during rush hour",
    "Blizzard whiteout on the highway",
    "Record-breaking heatwave hits 47°C",
    "Lost at sea on a raft",
    "Stuck in a lift",
    "Solar storm knocks out the grid",
    "Hurricane makes landfall",
    "Tornado warning at night",
    "Sandstorm in the desert",
    "Volcano wakes up nearby",
    "Landslide blocks the only road",
    "Lost in a dense forest",
    "Stranded on a desert island",
    "Cave flooding during a tour",
    "Internet goes down worldwide",
    "Water supply cut for a week",
    "Alien signal causes mass panic",
  ],
  person: [
    "A night-shift nurse",
    "A 12-year-old with a walkie-talkie",
    "A retired bus driver",
    "A pizza delivery rider",
    "A new kid at school",
    "A grandma who loves crosswords",
    "A camp counselor on day one",
    "A food truck owner",
    "A shy library volunteer",
    "A high school track star",
    "A dad with twin toddlers",
    "A park ranger near retirement",
    "A teen who streams video games",
    "A wedding photographer",
    "A school janitor with a master key",
    "A mail carrier on her last route",
    "A substitute science teacher",
    "A dog walker with five dogs",
    "A college student on spring break",
    "A hotel night clerk",
    "A farmer with a stubborn goat",
    "An exchange student who speaks little English",
  ],
  place: [
    "A stalled subway car",
    "A rooftop pool",
    "A shopping mall food court",
    "A small-town gas station",
    "A Ferris wheel stuck at the top",
    "A school gym after hours",
    "A lighthouse on a rocky point",
    "A highway rest stop",
    "A cruise ship lifeboat",
    "A drive-in movie theater",
    "A big-box store at closing time",
    "A hospital parking garage",
    "A treehouse in the backyard",
    "A ranger tower above the forest",
    "A packed stadium concourse",
    "A desert motel with one sign lit",
    "A houseboat on a wide river",
    "A city bus on a bridge",
    "A mountain cabin with no signal",
    "A greenhouse on a city roof",
    "A ski lift halfway up",
    "A public library basement",
  ],
  twist: [
    "The radio is lying",
    "The map is out of date",
    "The rescue team is late",
    "Someone in the group has a secret",
    "The dog knows the way out",
    "Help arrives from the wrong direction",
    "The last phone has 2% battery",
    "The stranger is actually a neighbor",
    "The safe place is already full",
    "A kid has the best plan",
    "Everyone remembers it differently",
    "The storm was only the beginning",
    "The exit sign points the wrong way",
    "A message is hidden in the drawings",
    "The clock stopped hours ago",
    "The real danger is the rumor",
    "They are not the only survivors",
    "The weather report was a prank",
    "A lost pet leads them home",
    "The shortcut is a long way around",
    "Someone has been here before",
    "The countdown resets every night",
  ],
};

const lowerFirst = (str) => {
  const s = String(str || "").trim();
  if (!s) return "";
  // Keep acronyms / "I" as-is (e.g. "TV", "I think").
  if (/^[A-Z]{2,}\b/.test(s) || /^I\b/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};

const clean = (str) => String(str || "").trim().replace(/[.\s]+$/, "");

export const sentence = ({ scenario, person, place, twist } = {}) => {
  const sc = clean(scenario);
  const pe = clean(person);
  const pl = lowerFirst(clean(place));
  const tw = lowerFirst(clean(twist));

  let out = sc ? `${sc}.` : "";
  const middle = [pe, pl].filter(Boolean).join(", ");
  let tail = middle;
  if (tw) tail = middle ? `${middle} — and ${tw}` : tw.charAt(0).toUpperCase() + tw.slice(1);
  if (tail) {
    tail = tail.charAt(0).toUpperCase() + tail.slice(1);
    out = out ? `${out} ${tail}.` : `${tail}.`;
  }
  return out;
};
