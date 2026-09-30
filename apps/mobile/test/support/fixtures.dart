/// JSON the API sends, for the fake API in tests.
library;

Map<String, dynamic> meJson({
  bool student = true,
  String language = 'en',
  bool mustAcceptTerms = false,
}) => {
  'id': student ? 'student-1' : 'parent-1',
  'kind': student ? 'STUDENT' : 'ADULT',
  'email': student ? null : 'parent@example.com',
  'username': student ? 'swift-falcon-4821' : null,
  'displayName': student ? null : 'Amina',
  'languageCode': language,
  'countryCode': 'PK',
  'role': {
    'key': student ? 'student' : 'parent',
    'name': student ? 'Student' : 'Parent',
    'isStaff': false,
  },
  'twoFactorEnabled': false,
  'mustAcceptTerms': mustAcceptTerms,
  'student': student ? {'nickname': 'Sara', 'avatarKey': 'rocket'} : null,
  'rules': <Object>[],
};

Map<String, dynamic> loginJson({
  bool student = true,
  String access = 'access-1',
  String refresh = 'refresh-1',
}) => {
  'status': 'authenticated',
  'accessToken': access,
  'expiresIn': 900,
  'refreshToken': refresh,
  'mfaToken': null,
  'user': meJson(student: student),
};

Map<String, dynamic> progressJson({
  int xp = 0,
  int todayXp = 0,
  int streak = 0,
  bool doneToday = false,
}) => {
  'xpTotal': xp,
  'level': {'number': 1, 'minXp': 0, 'nextMinXp': 100},
  'today': {'xp': todayXp, 'goalXp': 20, 'capXp': 300, 'capReached': false},
  'streak': {
    'current': streak,
    'longest': streak,
    'doneToday': doneToday,
    'freezes': 0,
    'freezesNeeded': 0,
  },
  'week': {
    'key': '2026-W40',
    'startDay': '2026-09-28',
    'endDay': '2026-10-05',
    'xp': todayXp,
    'hidden': false,
    'globalRank': null,
    'countryRank': null,
    'regionRank': null,
    'cityRank': null,
    'countryCode': 'PK',
  },
  'season': null,
  'badges': {'earned': 0, 'total': 18, 'unseen': 0},
};

Map<String, dynamic> choiceQuiz(
  String id, {
  String answerText = 'Right',
  String lessonTitle = 'Hello, HTML',
}) => {
  'id': id,
  'lessonId': 'builder-m01-l01',
  'kind': 'CHOICE',
  'xp': 5,
  'codeLanguage': null,
  'prompt': 'Question $id?',
  'lines': <Object>[],
  'options': [
    {'id': 'a', 'text': answerText, 'code': null},
    {'id': 'b', 'text': 'Wrong', 'code': null},
  ],
  'solved': false,
  'lessonTitle': lessonTitle,
};

Map<String, dynamic> orderQuiz(String id) => {
  'id': id,
  'lessonId': 'builder-m01-l01',
  'kind': 'ORDER',
  'xp': 5,
  'codeLanguage': 'html',
  'prompt': 'Put the lines in order.',
  'lines': [
    {'id': 'c3', 'text': '</body>'},
    {'id': 'a1', 'text': '<body>'},
    {'id': 'b2', 'text': '  <h1>Hi</h1>'},
  ],
  'options': <Object>[],
  'solved': false,
  'lessonTitle': 'Hello, HTML',
};

Map<String, dynamic> practiceJson(
  List<Map<String, dynamic>> quizzes, {
  List<String> answered = const [],
  bool done = false,
}) => {
  'day': '2026-10-01',
  'xp': 20,
  'total': quizzes.length,
  'done': done,
  'answeredQuizIds': answered,
  'quizzes': quizzes,
};

Map<String, dynamic> resultJson({
  required bool correct,
  int xp = 0,
  String? explanation,
  Map<String, dynamic>? reveal,
  Map<String, dynamic>? practice,
}) => {
  'correct': correct,
  'explanation': explanation,
  'reveal': reveal,
  'xpAwarded': xp,
  'dailyCapReached': false,
  'badgesEarned': <String>[],
  'practice': practice,
};

Map<String, dynamic> overviewJson() => {
  'tracks': [
    {
      'id': 'builder',
      'title': 'Builder',
      'modules': [
        {
          'id': 'builder-m01',
          'title': 'Your first website',
          'description': 'HTML and CSS',
          'lessons': [
            {
              'id': 'builder-m01-l01',
              'title': 'Hello, HTML',
              'summary': 'Your first page',
              'xp': 20,
              'isPremium': false,
              'locked': false,
              'challengeCount': 2,
              'quizCount': 3,
              'status': 'STARTED',
            },
          ],
          'project': null,
        },
      ],
    },
  ],
  'nextLessonId': 'builder-m01-l01',
  'lessonsCompleted': 0,
  'premium': null,
};

Map<String, dynamic> childJson({
  String id = 'child-1',
  bool leaderboards = false,
  bool reminders = true,
}) => {
  'id': id,
  'username': 'swift-falcon-4821',
  'nickname': 'Sara',
  'avatarKey': 'rocket',
  'birthYear': 2014,
  'languageCode': 'ur',
  'countryCode': 'PK',
  'regionId': null,
  'cityId': null,
  'status': 'ACTIVE',
  'consents': {'publicLeaderboards': leaderboards, 'publicPortfolio': false},
  'createdAt': '2026-09-01T10:00:00.000Z',
  'lastLoginAt': '2026-09-30T10:00:00.000Z',
  'lessonsCompleted': 3,
  'premiumUntil': '2026-10-10T00:00:00.000Z',
  'premiumSource': 'trial',
  'trialEndsAt': '2026-10-10T00:00:00.000Z',
  'xpTotal': 120,
  'level': 2,
  'streak': 4,
  'badges': 2,
  'streakReminders': reminders,
};

Map<String, dynamic> billingJson() => {
  'countryCode': 'PK',
  'currency': 'PKR',
  'familyDiscountPercent': null,
  'trialDays': 14,
  'checkoutAvailable': false,
  'plans': <Object>[],
  'children': <Object>[],
  'subscription': null,
  'invoices': <Object>[],
};
