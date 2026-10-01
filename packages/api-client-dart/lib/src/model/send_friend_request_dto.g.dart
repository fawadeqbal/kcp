// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'send_friend_request_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SendFriendRequestDtoCWProxy {
  SendFriendRequestDto code(String code);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SendFriendRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SendFriendRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SendFriendRequestDto call({String code});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSendFriendRequestDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSendFriendRequestDto.copyWith.fieldName(...)`
class _$SendFriendRequestDtoCWProxyImpl
    implements _$SendFriendRequestDtoCWProxy {
  const _$SendFriendRequestDtoCWProxyImpl(this._value);

  final SendFriendRequestDto _value;

  @override
  SendFriendRequestDto code(String code) => this(code: code);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SendFriendRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SendFriendRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SendFriendRequestDto call({Object? code = const $CopyWithPlaceholder()}) {
    return SendFriendRequestDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String,
    );
  }
}

extension $SendFriendRequestDtoCopyWith on SendFriendRequestDto {
  /// Returns a callable class that can be used as follows: `instanceOfSendFriendRequestDto.copyWith(...)` or like so:`instanceOfSendFriendRequestDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SendFriendRequestDtoCWProxy get copyWith =>
      _$SendFriendRequestDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SendFriendRequestDto _$SendFriendRequestDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('SendFriendRequestDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['code']);
  final val = SendFriendRequestDto(
    code: $checkedConvert('code', (v) => v as String),
  );
  return val;
});

Map<String, dynamic> _$SendFriendRequestDtoToJson(
  SendFriendRequestDto instance,
) => <String, dynamic>{'code': instance.code};
