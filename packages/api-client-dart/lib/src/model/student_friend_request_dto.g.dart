// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'student_friend_request_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$StudentFriendRequestDtoCWProxy {
  StudentFriendRequestDto status(StudentFriendRequestDtoStatusEnum status);

  StudentFriendRequestDto id(String id);

  StudentFriendRequestDto nickname(String nickname);

  StudentFriendRequestDto avatarKey(String avatarKey);

  StudentFriendRequestDto createdAt(DateTime createdAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StudentFriendRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StudentFriendRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StudentFriendRequestDto call({
    StudentFriendRequestDtoStatusEnum status,
    String id,
    String nickname,
    String avatarKey,
    DateTime createdAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfStudentFriendRequestDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfStudentFriendRequestDto.copyWith.fieldName(...)`
class _$StudentFriendRequestDtoCWProxyImpl
    implements _$StudentFriendRequestDtoCWProxy {
  const _$StudentFriendRequestDtoCWProxyImpl(this._value);

  final StudentFriendRequestDto _value;

  @override
  StudentFriendRequestDto status(StudentFriendRequestDtoStatusEnum status) =>
      this(status: status);

  @override
  StudentFriendRequestDto id(String id) => this(id: id);

  @override
  StudentFriendRequestDto nickname(String nickname) => this(nickname: nickname);

  @override
  StudentFriendRequestDto avatarKey(String avatarKey) =>
      this(avatarKey: avatarKey);

  @override
  StudentFriendRequestDto createdAt(DateTime createdAt) =>
      this(createdAt: createdAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StudentFriendRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StudentFriendRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StudentFriendRequestDto call({
    Object? status = const $CopyWithPlaceholder(),
    Object? id = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? createdAt = const $CopyWithPlaceholder(),
  }) {
    return StudentFriendRequestDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as StudentFriendRequestDtoStatusEnum,
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String,
      createdAt: createdAt == const $CopyWithPlaceholder()
          ? _value.createdAt
          // ignore: cast_nullable_to_non_nullable
          : createdAt as DateTime,
    );
  }
}

extension $StudentFriendRequestDtoCopyWith on StudentFriendRequestDto {
  /// Returns a callable class that can be used as follows: `instanceOfStudentFriendRequestDto.copyWith(...)` or like so:`instanceOfStudentFriendRequestDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$StudentFriendRequestDtoCWProxy get copyWith =>
      _$StudentFriendRequestDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

StudentFriendRequestDto _$StudentFriendRequestDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('StudentFriendRequestDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const ['status', 'id', 'nickname', 'avatarKey', 'createdAt'],
  );
  final val = StudentFriendRequestDto(
    status: $checkedConvert(
      'status',
      (v) => $enumDecode(
        _$StudentFriendRequestDtoStatusEnumEnumMap,
        v,
        unknownValue: StudentFriendRequestDtoStatusEnum.unknownDefaultOpenApi,
      ),
    ),
    id: $checkedConvert('id', (v) => v as String),
    nickname: $checkedConvert('nickname', (v) => v as String),
    avatarKey: $checkedConvert('avatarKey', (v) => v as String),
    createdAt: $checkedConvert('createdAt', (v) => DateTime.parse(v as String)),
  );
  return val;
});

Map<String, dynamic> _$StudentFriendRequestDtoToJson(
  StudentFriendRequestDto instance,
) => <String, dynamic>{
  'status': _$StudentFriendRequestDtoStatusEnumEnumMap[instance.status]!,
  'id': instance.id,
  'nickname': instance.nickname,
  'avatarKey': instance.avatarKey,
  'createdAt': instance.createdAt.toIso8601String(),
};

const _$StudentFriendRequestDtoStatusEnumEnumMap = {
  StudentFriendRequestDtoStatusEnum.PENDING: 'PENDING',
  StudentFriendRequestDtoStatusEnum.APPROVED: 'APPROVED',
  StudentFriendRequestDtoStatusEnum.DECLINED: 'DECLINED',
  StudentFriendRequestDtoStatusEnum.CANCELLED: 'CANCELLED',
  StudentFriendRequestDtoStatusEnum.EXPIRED: 'EXPIRED',
  StudentFriendRequestDtoStatusEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
