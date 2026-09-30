// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'feedback_created_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FeedbackCreatedDtoCWProxy {
  FeedbackCreatedDto id(String id);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FeedbackCreatedDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FeedbackCreatedDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FeedbackCreatedDto call({String id});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFeedbackCreatedDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFeedbackCreatedDto.copyWith.fieldName(...)`
class _$FeedbackCreatedDtoCWProxyImpl implements _$FeedbackCreatedDtoCWProxy {
  const _$FeedbackCreatedDtoCWProxyImpl(this._value);

  final FeedbackCreatedDto _value;

  @override
  FeedbackCreatedDto id(String id) => this(id: id);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FeedbackCreatedDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FeedbackCreatedDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FeedbackCreatedDto call({Object? id = const $CopyWithPlaceholder()}) {
    return FeedbackCreatedDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
    );
  }
}

extension $FeedbackCreatedDtoCopyWith on FeedbackCreatedDto {
  /// Returns a callable class that can be used as follows: `instanceOfFeedbackCreatedDto.copyWith(...)` or like so:`instanceOfFeedbackCreatedDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FeedbackCreatedDtoCWProxy get copyWith =>
      _$FeedbackCreatedDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FeedbackCreatedDto _$FeedbackCreatedDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FeedbackCreatedDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['id']);
      final val = FeedbackCreatedDto(
        id: $checkedConvert('id', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$FeedbackCreatedDtoToJson(FeedbackCreatedDto instance) =>
    <String, dynamic>{'id': instance.id};
