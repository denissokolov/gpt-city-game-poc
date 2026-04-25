import type { PlayerSex } from "@/game/store";

export type Messages = {
  language: {
    label: string;
    name: Record<"en-US" | "ru", string>;
    short: Record<"en-US" | "ru", string>;
  };
  common: {
    back: string;
    backToMap: string;
    changeAvatar: string;
    reset: string;
    shuffle: string;
    send: string;
    somethingWentWrong: string;
  };
  sex: Record<PlayerSex, string>;
  onboarding: {
    welcomeTo: string;
    title: string;
    subtitle: string;
    firstName: string;
    firstNamePlaceholder: string;
    lastName: string;
    lastNamePlaceholder: string;
    age: string;
    sex: string;
    titleLabel: string;
    titleHint: string;
    titlePlaceholder: string;
    backstoryLabel: string;
    backstoryHint: string;
    backstoryPlaceholder: string;
    avatarStyle: string;
    avatarPreviewAlt: string;
    submit: string;
    submitting: string;
  };
  map: {
    playingAs: string;
    heading: string;
    description: string;
  };
  location: {
    label: string;
    noPlaces: string;
    nobodyHere: string;
    countsSummary: (args: { places: number; people: number }) => string;
  };
  chat: {
    typing: string;
    sayHello: (name: string) => string;
    theyFallback: string;
    messagePlaceholder: (name: string | undefined) => string;
    staleConversation: string;
  };
  systemChat: {
    title: string;
    subtitle: string;
    open: string;
    close: string;
    placeholder: string;
    empty: string;
    newConversation: string;
    typing: string;
    staleConversation: string;
  };
  loading: {
    statuses: string[];
    heading: string;
  };
  timeChanger: {
    pretending: string;
    localTime: string;
    resetToNow: string;
    exactTime: string;
    presets: {
      dawn: string;
      morning: string;
      noon: string;
      evening: string;
      night: string;
    };
    partsOfDay: {
      morning: string;
      midday: string;
      afternoon: string;
      evening: string;
      night: string;
    };
  };
};

const en: Messages = {
  language: {
    label: "Language",
    name: { "en-US": "English", ru: "Russian" },
    short: { "en-US": "EN", ru: "RU" },
  },
  common: {
    back: "Back",
    backToMap: "Back to map",
    changeAvatar: "Change avatar",
    reset: "Reset",
    shuffle: "Shuffle",
    send: "Send",
    somethingWentWrong: "Something went wrong",
  },
  sex: {
    male: "Male",
    female: "Female",
    non_binary: "Non-binary",
  },
  onboarding: {
    welcomeTo: "Welcome to",
    title: "GPT City",
    subtitle:
      "Create your avatar, walk the streets, and strike up conversations with the minds who live here.",
    firstName: "First name",
    firstNamePlaceholder: "Ada",
    lastName: "Last name",
    lastNamePlaceholder: "Lovelace",
    age: "Age",
    sex: "Sex",
    titleLabel: "Title",
    titleHint: "(how the city knows you)",
    titlePlaceholder: "Traveler",
    backstoryLabel: "Backstory",
    backstoryHint: "(where you came from, what shaped you)",
    backstoryPlaceholder:
      "A curious visitor exploring GPT City, eager to meet its inhabitants.",
    avatarStyle: "Avatar style",
    avatarPreviewAlt: "Avatar preview",
    submit: "Enter the city →",
    submitting: "Creating…",
  },
  map: {
    playingAs: "Playing as",
    heading: "GPT City",
    description:
      "Click your current location to explore it, or click a neighbor to walk over.",
  },
  location: {
    label: "Location",
    noPlaces: "No notable spots here yet.",
    nobodyHere: "Nobody is here right now.",
    countsSummary: ({ places, people }) => {
      const placePart = places === 1 ? "1 place" : `${places} places`;
      const peoplePart = people === 1 ? "1 person" : `${people} people`;
      return `${placePart} · ${peoplePart} around right now`;
    },
  },
  chat: {
    typing: "typing…",
    sayHello: (name) => `Say hello to ${name}.`,
    theyFallback: "them",
    messagePlaceholder: (name) =>
      name ? `Message ${name}…` : "Type a message…",
    staleConversation:
      "This conversation is no longer available. Starting a fresh one…",
  },
  systemChat: {
    title: "Game Assistant",
    subtitle: "Build and manage your city",
    open: "Open game assistant",
    close: "Close game assistant",
    placeholder: "Ask the assistant to create or change something…",
    empty:
      "Hi! I can help you create locations, places, and characters, or update existing ones. What would you like to do?",
    newConversation: "New",
    typing: "thinking…",
    staleConversation:
      "This assistant chat is no longer available. Starting a fresh one…",
  },
  loading: {
    heading: "Loading the scene",
    statuses: [
      "Tuning into the city frequency…",
      "Checking who stepped out for coffee…",
      "Asking the locals where everyone is…",
      "Lining up the NPCs by time of day…",
      "Polishing the scene for your arrival…",
    ],
  },
  timeChanger: {
    pretending: "Pretending it\u2019s",
    localTime: "Local time",
    resetToNow: "Reset to now",
    exactTime: "Exact time",
    presets: {
      dawn: "Dawn",
      morning: "Morning",
      noon: "Noon",
      evening: "Evening",
      night: "Night",
    },
    partsOfDay: {
      morning: "Morning",
      midday: "Midday",
      afternoon: "Afternoon",
      evening: "Evening",
      night: "Night",
    },
  },
};

function ruPlural(
  n: number,
  forms: [one: string, few: string, many: string],
): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return forms[1];
  return forms[2];
}

const ru: Messages = {
  language: {
    label: "Язык",
    name: { "en-US": "Английский", ru: "Русский" },
    short: { "en-US": "EN", ru: "RU" },
  },
  common: {
    back: "Назад",
    backToMap: "К карте",
    changeAvatar: "Сменить аватар",
    reset: "Сброс",
    shuffle: "Перемешать",
    send: "Отправить",
    somethingWentWrong: "Что-то пошло не так",
  },
  sex: {
    male: "Мужской",
    female: "Женский",
    non_binary: "Небинарный",
  },
  onboarding: {
    welcomeTo: "Добро пожаловать в",
    title: "GPT City",
    subtitle:
      "Создайте аватар, прогуляйтесь по улицам и заведите разговор с теми, кто здесь живёт.",
    firstName: "Имя",
    firstNamePlaceholder: "Ада",
    lastName: "Фамилия",
    lastNamePlaceholder: "Лавлейс",
    age: "Возраст",
    sex: "Пол",
    titleLabel: "Роль",
    titleHint: "(как вас знает город)",
    titlePlaceholder: "Путешественник",
    backstoryLabel: "Предыстория",
    backstoryHint: "(откуда вы и что вас сформировало)",
    backstoryPlaceholder:
      "Любопытный гость, исследующий GPT City и жаждущий познакомиться с его жителями.",
    avatarStyle: "Стиль аватара",
    avatarPreviewAlt: "Предпросмотр аватара",
    submit: "Войти в город →",
    submitting: "Создаём…",
  },
  map: {
    playingAs: "Вы играете за",
    heading: "GPT City",
    description:
      "Нажмите на свою локацию, чтобы исследовать её, или на соседнюю — чтобы дойти пешком.",
  },
  location: {
    label: "Локация",
    noPlaces: "Здесь пока нет интересных мест.",
    nobodyHere: "Сейчас здесь никого нет.",
    countsSummary: ({ places, people }) => {
      const placeWord = ruPlural(places, ["место", "места", "мест"]);
      const peopleWord = ruPlural(people, ["человек", "человека", "человек"]);
      return `${places} ${placeWord} · ${people} ${peopleWord} сейчас рядом`;
    },
  },
  chat: {
    typing: "печатает…",
    sayHello: (name) => `Поздоровайтесь с ${name}.`,
    theyFallback: "ними",
    messagePlaceholder: (name) =>
      name ? `Написать ${name}…` : "Введите сообщение…",
    staleConversation: "Эта беседа больше недоступна. Начинаем новую…",
  },
  systemChat: {
    title: "Игровой ассистент",
    subtitle: "Стройте и управляйте городом",
    open: "Открыть игрового ассистента",
    close: "Закрыть игрового ассистента",
    placeholder: "Попросите ассистента создать или изменить что-нибудь…",
    empty:
      "Привет! Я помогу создать локации, места и персонажей или изменить существующих. С чего начнём?",
    newConversation: "Новый",
    typing: "думает…",
    staleConversation:
      "Этот чат с ассистентом больше недоступен. Начинаем новый…",
  },
  loading: {
    heading: "Готовим сцену",
    statuses: [
      "Настраиваемся на волну города…",
      "Проверяем, кто вышел за кофе…",
      "Спрашиваем местных, где все…",
      "Расставляем NPC по времени суток…",
      "Наводим блеск перед вашим приходом…",
    ],
  },
  timeChanger: {
    pretending: "Делаем вид, что сейчас",
    localTime: "Местное время",
    resetToNow: "Сбросить на сейчас",
    exactTime: "Точное время",
    presets: {
      dawn: "Рассвет",
      morning: "Утро",
      noon: "Полдень",
      evening: "Вечер",
      night: "Ночь",
    },
    partsOfDay: {
      morning: "Утро",
      midday: "Полдень",
      afternoon: "День",
      evening: "Вечер",
      night: "Ночь",
    },
  },
};

export const MESSAGES: Record<"en-US" | "ru", Messages> = {
  "en-US": en,
  ru,
};
