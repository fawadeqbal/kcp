// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'report_chat_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ReportChatDtoCWProxy {
  ReportChatDto messageId(String? messageId);

  ReportChatDto userId(String? userId);

  ReportChatDto reason(ReportChatDtoReasonEnum reason);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReportChatDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReportChatDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReportChatDto call({
    String? messageId,
    String? userId,
    ReportChatDtoReasonEnum reason,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfReportChatDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfReportChatDto.copyWith.fieldName(...)`
class _$ReportChatDtoCWProxyImpl implements _$ReportChatDtoCWProxy {
  const _$ReportChatDtoCWProxyImpl(this._value);

  final ReportChatDto _value;

  @override
  ReportChatDto messageId(String? messageId) => this(messageId: messageId);

  @override
  ReportChatDto userId(String? userId) => this(userId: userId);

  @override
  ReportChatDto reason(ReportChatDtoReasonEnum reason) => this(reason: reason);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReportChatDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReportChatDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReportChatDto call({
    Object? messageId = const $CopyWithPlaceholder(),
    Object? userId = const $CopyWithPlaceholder(),
    Object? reason = const $CopyWithPlaceholder(),
  }) {
    return ReportChatDto(
      messageId: messageId == const $CopyWithPlaceholder()
          ? _value.messageId
          // ignore: cast_nullable_to_non_nullable
          : messageId as String?,
      userId: userId == const $CopyWithPlaceholder()
          ? _value.userId
          // ignore: cast_nullable_to_non_nullable
          : userId as String?,
      reason: reason == const $CopyWithPlaceholder()
          ? _value.reason
          // ignore: cast_nullable_to_non_nullable
          : reason as ReportChatDtoReasonEnum,
    );
  }
}

extension $ReportChatDtoCopyWith on ReportChatDto {
  /// Returns a callable class that can be used as follows: `instanceOfReportChatDto.copyWith(...)` or like so:`instanceOfReportChatDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ReportChatDtoCWProxy get copyWith => _$ReportChatDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ReportChatDto _$ReportChatDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ReportChatDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['reason']);
      final val = ReportChatDto(
        messageId: $checkedConvert('messageId', (v) => v as String?),
        userId: $checkedConvert('userId', (v) => v as String?),
        reason: $checkedConvert(
          'reason',
          (v) => $enumDecode(
            _$ReportChatDtoReasonEnumEnumMap,
            v,
            unknownValue: ReportChatDtoReasonEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ReportChatDtoToJson(ReportChatDto instance) =>
    <String, dynamic>{
      'messageId': ?instance.messageId,
      'userId': ?instance.userId,
      'reason': _$ReportChatDtoReasonEnumEnumMap[instance.reason]!,
    };

const _$ReportChatDtoReasonEnumEnumMap = {
  ReportChatDtoReasonEnum.UNKIND: 'UNKIND',
  ReportChatDtoReasonEnum.PERSONAL_INFO: 'PERSONAL_INFO',
  ReportChatDtoReasonEnum.SPAM: 'SPAM',
  ReportChatDtoReasonEnum.SCARY: 'SCARY',
  ReportChatDtoReasonEnum.OTHER: 'OTHER',
  ReportChatDtoReasonEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
