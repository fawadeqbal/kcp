// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'student_summary_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$StudentSummaryDtoCWProxy {
  StudentSummaryDto nickname(String nickname);

  StudentSummaryDto avatarKey(String avatarKey);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StudentSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StudentSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StudentSummaryDto call({String nickname, String avatarKey});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfStudentSummaryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfStudentSummaryDto.copyWith.fieldName(...)`
class _$StudentSummaryDtoCWProxyImpl implements _$StudentSummaryDtoCWProxy {
  const _$StudentSummaryDtoCWProxyImpl(this._value);

  final StudentSummaryDto _value;

  @override
  StudentSummaryDto nickname(String nickname) => this(nickname: nickname);

  @override
  StudentSummaryDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StudentSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StudentSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StudentSummaryDto call({
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
  }) {
    return StudentSummaryDto(
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String,
    );
  }
}

extension $StudentSummaryDtoCopyWith on StudentSummaryDto {
  /// Returns a callable class that can be used as follows: `instanceOfStudentSummaryDto.copyWith(...)` or like so:`instanceOfStudentSummaryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$StudentSummaryDtoCWProxy get copyWith =>
      _$StudentSummaryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

StudentSummaryDto _$StudentSummaryDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('StudentSummaryDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['nickname', 'avatarKey']);
      final val = StudentSummaryDto(
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$StudentSummaryDtoToJson(StudentSummaryDto instance) =>
    <String, dynamic>{
      'nickname': instance.nickname,
      'avatarKey': instance.avatarKey,
    };
