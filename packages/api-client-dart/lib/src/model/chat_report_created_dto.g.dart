// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_report_created_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChatReportCreatedDtoCWProxy {
  ChatReportCreatedDto id(String id);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatReportCreatedDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatReportCreatedDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatReportCreatedDto call({String id});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChatReportCreatedDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChatReportCreatedDto.copyWith.fieldName(...)`
class _$ChatReportCreatedDtoCWProxyImpl
    implements _$ChatReportCreatedDtoCWProxy {
  const _$ChatReportCreatedDtoCWProxyImpl(this._value);

  final ChatReportCreatedDto _value;

  @override
  ChatReportCreatedDto id(String id) => this(id: id);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatReportCreatedDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatReportCreatedDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatReportCreatedDto call({Object? id = const $CopyWithPlaceholder()}) {
    return ChatReportCreatedDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
    );
  }
}

extension $ChatReportCreatedDtoCopyWith on ChatReportCreatedDto {
  /// Returns a callable class that can be used as follows: `instanceOfChatReportCreatedDto.copyWith(...)` or like so:`instanceOfChatReportCreatedDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChatReportCreatedDtoCWProxy get copyWith =>
      _$ChatReportCreatedDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatReportCreatedDto _$ChatReportCreatedDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ChatReportCreatedDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['id']);
  final val = ChatReportCreatedDto(
    id: $checkedConvert('id', (v) => v as String),
  );
  return val;
});

Map<String, dynamic> _$ChatReportCreatedDtoToJson(
  ChatReportCreatedDto instance,
) => <String, dynamic>{'id': instance.id};
