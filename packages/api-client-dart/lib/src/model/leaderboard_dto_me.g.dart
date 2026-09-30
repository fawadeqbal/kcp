// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leaderboard_dto_me.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LeaderboardDtoMeCWProxy {
  LeaderboardDtoMe rank(num? rank);

  LeaderboardDtoMe xp(num xp);

  LeaderboardDtoMe hidden(bool hidden);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeaderboardDtoMe(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeaderboardDtoMe(...).copyWith(id: 12, name: "My name")
  /// ````
  LeaderboardDtoMe call({num? rank, num xp, bool hidden});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLeaderboardDtoMe.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLeaderboardDtoMe.copyWith.fieldName(...)`
class _$LeaderboardDtoMeCWProxyImpl implements _$LeaderboardDtoMeCWProxy {
  const _$LeaderboardDtoMeCWProxyImpl(this._value);

  final LeaderboardDtoMe _value;

  @override
  LeaderboardDtoMe rank(num? rank) => this(rank: rank);

  @override
  LeaderboardDtoMe xp(num xp) => this(xp: xp);

  @override
  LeaderboardDtoMe hidden(bool hidden) => this(hidden: hidden);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeaderboardDtoMe(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeaderboardDtoMe(...).copyWith(id: 12, name: "My name")
  /// ````
  LeaderboardDtoMe call({
    Object? rank = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? hidden = const $CopyWithPlaceholder(),
  }) {
    return LeaderboardDtoMe(
      rank: rank == const $CopyWithPlaceholder()
          ? _value.rank
          // ignore: cast_nullable_to_non_nullable
          : rank as num?,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      hidden: hidden == const $CopyWithPlaceholder()
          ? _value.hidden
          // ignore: cast_nullable_to_non_nullable
          : hidden as bool,
    );
  }
}

extension $LeaderboardDtoMeCopyWith on LeaderboardDtoMe {
  /// Returns a callable class that can be used as follows: `instanceOfLeaderboardDtoMe.copyWith(...)` or like so:`instanceOfLeaderboardDtoMe.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LeaderboardDtoMeCWProxy get copyWith => _$LeaderboardDtoMeCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeaderboardDtoMe _$LeaderboardDtoMeFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LeaderboardDtoMe', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['rank', 'xp', 'hidden']);
      final val = LeaderboardDtoMe(
        rank: $checkedConvert('rank', (v) => v as num?),
        xp: $checkedConvert('xp', (v) => v as num),
        hidden: $checkedConvert('hidden', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$LeaderboardDtoMeToJson(LeaderboardDtoMe instance) =>
    <String, dynamic>{
      'rank': instance.rank,
      'xp': instance.xp,
      'hidden': instance.hidden,
    };
