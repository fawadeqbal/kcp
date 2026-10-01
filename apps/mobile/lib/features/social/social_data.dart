import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';

/// The student's league this week.
final leagueProvider = FutureProvider.autoDispose<LeagueDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getProgressApi().progressLeague()).data!;
});

/// The student's friend code, friends and requests.
final friendsProvider = FutureProvider.autoDispose<FriendsDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getFriendsApi().friendsList()).data!;
});

/// This week's XP of the student and their friends.
final friendBoardProvider = FutureProvider.autoDispose<FriendBoardDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getFriendsApi().friendsBoard()).data!;
});

/// A parent's children's open friend requests.
final parentFriendRequestsProvider = FutureProvider.autoDispose<List<ParentFriendRequestDto>>((
  ref,
) async {
  final api = ref.watch(apiProvider);
  return (await api.getFriendsApi().parentFriendsRequests()).data!;
});

/// One child's friends, for their parent.
final childFriendsProvider = FutureProvider.autoDispose.family<List<FriendDto>, String>((
  ref,
  childId,
) async {
  final api = ref.watch(apiProvider);
  return (await api.getFriendsApi().parentFriendsChildFriends(id: childId)).data!;
});

/// League tiers, lowest first (packages/shared LEAGUE_TIERS).
const leagueTiers = ['bronze', 'silver', 'gold', 'sapphire', 'ruby', 'emerald', 'diamond'];

String leagueTierName(AppLocalizations t, String tier) => switch (tier) {
  'silver' => t.leagueSilver,
  'gold' => t.leagueGold,
  'sapphire' => t.leagueSapphire,
  'ruby' => t.leagueRuby,
  'emerald' => t.leagueEmerald,
  'diamond' => t.leagueDiamond,
  _ => t.leagueBronze,
};

/// Each league's medal colour (as on the web); medals keep dark ink in dark mode.
const leagueColours = <String, Color>{
  'bronze': Color(0xFFD9A27A),
  'silver': Color(0xFFC9CCD3),
  'gold': Color(0xFFF0C75E),
  'sapphire': Color(0xFF8FB2EC),
  'ruby': Color(0xFFEE9AA6),
  'emerald': Color(0xFF8FD1B0),
  'diamond': Color(0xFFBFE6F3),
};
