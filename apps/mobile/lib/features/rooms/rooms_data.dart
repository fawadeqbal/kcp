import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';

/// The rooms the student is in (their teams, classes and events).
final roomsProvider = FutureProvider.autoDispose<List<ChatRoomDto>>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getRoomsApi().chatRooms()).data!;
});

/// A child's rooms, for their parent (read only).
final childRoomsProvider = FutureProvider.autoDispose.family<List<ChatRoomDto>, String>((
  ref,
  childId,
) async {
  final api = ref.watch(apiProvider);
  return (await api.getRoomsApi().parentChatRooms(childId: childId)).data!;
});

/// Ready-made phrases, in the order the web app shows them (packages/shared CHAT_PHRASES).
final roomPhrases = [
  for (final phrase in SendChatMessageDtoPhraseEnum.values)
    if (phrase != SendChatMessageDtoPhraseEnum.unknownDefaultOpenApi) phrase,
];

/// The reasons a message can be reported for.
final roomReportReasons = [
  for (final reason in ReportChatDtoReasonEnum.values)
    if (reason != ReportChatDtoReasonEnum.unknownDefaultOpenApi) reason,
];

/// A phrase in the reader's language (unknown keys read as "Hello!").
String roomPhraseText(AppLocalizations t, String? key) => switch (key) {
  'thanks' => t.roomPhraseThanks,
  'great-job' => t.roomPhraseGreatJob,
  'lets-go' => t.roomPhraseLetsGo,
  'i-need-help' => t.roomPhraseINeedHelp,
  'can-you-check' => t.roomPhraseCanYouCheck,
  'i-have-an-idea' => t.roomPhraseIHaveAnIdea,
  'my-part-is-done' => t.roomPhraseMyPartIsDone,
  'good-idea' => t.roomPhraseGoodIdea,
  'give-me-a-minute' => t.roomPhraseGiveMeAMinute,
  'yes' => t.roomPhraseYes,
  'no' => t.roomPhraseNo,
  'see-you' => t.roomPhraseSeeYou,
  _ => t.roomPhraseHello,
};

String roomKindText(AppLocalizations t, ChatRoomDtoKindEnum kind) => switch (kind) {
  ChatRoomDtoKindEnum.CLASS => t.roomKindClass,
  ChatRoomDtoKindEnum.EVENT => t.roomKindEvent,
  _ => t.roomKindTeam,
};

String roomReasonText(AppLocalizations t, ReportChatDtoReasonEnum reason) => switch (reason) {
  ReportChatDtoReasonEnum.PERSONAL_INFO => t.roomReasonPersonalInfo,
  ReportChatDtoReasonEnum.SPAM => t.roomReasonSpam,
  ReportChatDtoReasonEnum.SCARY => t.roomReasonScary,
  ReportChatDtoReasonEnum.OTHER => t.roomReasonOther,
  _ => t.roomReasonUnkind,
};
