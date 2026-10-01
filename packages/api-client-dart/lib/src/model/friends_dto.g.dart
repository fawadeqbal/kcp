// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friends_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendsDtoCWProxy {
  FriendsDto code(String code);

  FriendsDto friends(List<FriendDto> friends);

  FriendsDto sent(List<StudentFriendRequestDto> sent);

  FriendsDto received(List<StudentFriendRequestDto> received);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendsDto call({
    String code,
    List<FriendDto> friends,
    List<StudentFriendRequestDto> sent,
    List<StudentFriendRequestDto> received,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendsDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendsDto.copyWith.fieldName(...)`
class _$FriendsDtoCWProxyImpl implements _$FriendsDtoCWProxy {
  const _$FriendsDtoCWProxyImpl(this._value);

  final FriendsDto _value;

  @override
  FriendsDto code(String code) => this(code: code);

  @override
  FriendsDto friends(List<FriendDto> friends) => this(friends: friends);

  @override
  FriendsDto sent(List<StudentFriendRequestDto> sent) => this(sent: sent);

  @override
  FriendsDto received(List<StudentFriendRequestDto> received) =>
      this(received: received);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendsDto call({
    Object? code = const $CopyWithPlaceholder(),
    Object? friends = const $CopyWithPlaceholder(),
    Object? sent = const $CopyWithPlaceholder(),
    Object? received = const $CopyWithPlaceholder(),
  }) {
    return FriendsDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String,
      friends: friends == const $CopyWithPlaceholder()
          ? _value.friends
          // ignore: cast_nullable_to_non_nullable
          : friends as List<FriendDto>,
      sent: sent == const $CopyWithPlaceholder()
          ? _value.sent
          // ignore: cast_nullable_to_non_nullable
          : sent as List<StudentFriendRequestDto>,
      received: received == const $CopyWithPlaceholder()
          ? _value.received
          // ignore: cast_nullable_to_non_nullable
          : received as List<StudentFriendRequestDto>,
    );
  }
}

extension $FriendsDtoCopyWith on FriendsDto {
  /// Returns a callable class that can be used as follows: `instanceOfFriendsDto.copyWith(...)` or like so:`instanceOfFriendsDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendsDtoCWProxy get copyWith => _$FriendsDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendsDto _$FriendsDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendsDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['code', 'friends', 'sent', 'received'],
      );
      final val = FriendsDto(
        code: $checkedConvert('code', (v) => v as String),
        friends: $checkedConvert(
          'friends',
          (v) => (v as List<dynamic>)
              .map((e) => FriendDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        sent: $checkedConvert(
          'sent',
          (v) => (v as List<dynamic>)
              .map(
                (e) =>
                    StudentFriendRequestDto.fromJson(e as Map<String, dynamic>),
              )
              .toList(),
        ),
        received: $checkedConvert(
          'received',
          (v) => (v as List<dynamic>)
              .map(
                (e) =>
                    StudentFriendRequestDto.fromJson(e as Map<String, dynamic>),
              )
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$FriendsDtoToJson(FriendsDto instance) =>
    <String, dynamic>{
      'code': instance.code,
      'friends': instance.friends.map((e) => e.toJson()).toList(),
      'sent': instance.sent.map((e) => e.toJson()).toList(),
      'received': instance.received.map((e) => e.toJson()).toList(),
    };
