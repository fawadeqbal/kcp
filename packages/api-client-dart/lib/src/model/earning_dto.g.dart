// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'earning_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$EarningDtoCWProxy {
  EarningDto id(String id);

  EarningDto projectTitle(String projectTitle);

  EarningDto projectReference(String projectReference);

  EarningDto currency(String currency);

  EarningDto amountMinor(num amountMinor);

  EarningDto earnedAt(DateTime earnedAt);

  EarningDto heldUntil(DateTime heldUntil);

  EarningDto releasedAt(DateTime? releasedAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EarningDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EarningDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EarningDto call({
    String id,
    String projectTitle,
    String projectReference,
    String currency,
    num amountMinor,
    DateTime earnedAt,
    DateTime heldUntil,
    DateTime? releasedAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfEarningDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfEarningDto.copyWith.fieldName(...)`
class _$EarningDtoCWProxyImpl implements _$EarningDtoCWProxy {
  const _$EarningDtoCWProxyImpl(this._value);

  final EarningDto _value;

  @override
  EarningDto id(String id) => this(id: id);

  @override
  EarningDto projectTitle(String projectTitle) =>
      this(projectTitle: projectTitle);

  @override
  EarningDto projectReference(String projectReference) =>
      this(projectReference: projectReference);

  @override
  EarningDto currency(String currency) => this(currency: currency);

  @override
  EarningDto amountMinor(num amountMinor) => this(amountMinor: amountMinor);

  @override
  EarningDto earnedAt(DateTime earnedAt) => this(earnedAt: earnedAt);

  @override
  EarningDto heldUntil(DateTime heldUntil) => this(heldUntil: heldUntil);

  @override
  EarningDto releasedAt(DateTime? releasedAt) => this(releasedAt: releasedAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EarningDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EarningDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EarningDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? projectTitle = const $CopyWithPlaceholder(),
    Object? projectReference = const $CopyWithPlaceholder(),
    Object? currency = const $CopyWithPlaceholder(),
    Object? amountMinor = const $CopyWithPlaceholder(),
    Object? earnedAt = const $CopyWithPlaceholder(),
    Object? heldUntil = const $CopyWithPlaceholder(),
    Object? releasedAt = const $CopyWithPlaceholder(),
  }) {
    return EarningDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      projectTitle: projectTitle == const $CopyWithPlaceholder()
          ? _value.projectTitle
          // ignore: cast_nullable_to_non_nullable
          : projectTitle as String,
      projectReference: projectReference == const $CopyWithPlaceholder()
          ? _value.projectReference
          // ignore: cast_nullable_to_non_nullable
          : projectReference as String,
      currency: currency == const $CopyWithPlaceholder()
          ? _value.currency
          // ignore: cast_nullable_to_non_nullable
          : currency as String,
      amountMinor: amountMinor == const $CopyWithPlaceholder()
          ? _value.amountMinor
          // ignore: cast_nullable_to_non_nullable
          : amountMinor as num,
      earnedAt: earnedAt == const $CopyWithPlaceholder()
          ? _value.earnedAt
          // ignore: cast_nullable_to_non_nullable
          : earnedAt as DateTime,
      heldUntil: heldUntil == const $CopyWithPlaceholder()
          ? _value.heldUntil
          // ignore: cast_nullable_to_non_nullable
          : heldUntil as DateTime,
      releasedAt: releasedAt == const $CopyWithPlaceholder()
          ? _value.releasedAt
          // ignore: cast_nullable_to_non_nullable
          : releasedAt as DateTime?,
    );
  }
}

extension $EarningDtoCopyWith on EarningDto {
  /// Returns a callable class that can be used as follows: `instanceOfEarningDto.copyWith(...)` or like so:`instanceOfEarningDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$EarningDtoCWProxy get copyWith => _$EarningDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EarningDto _$EarningDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('EarningDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'id',
      'projectTitle',
      'projectReference',
      'currency',
      'amountMinor',
      'earnedAt',
      'heldUntil',
      'releasedAt',
    ],
  );
  final val = EarningDto(
    id: $checkedConvert('id', (v) => v as String),
    projectTitle: $checkedConvert('projectTitle', (v) => v as String),
    projectReference: $checkedConvert('projectReference', (v) => v as String),
    currency: $checkedConvert('currency', (v) => v as String),
    amountMinor: $checkedConvert('amountMinor', (v) => v as num),
    earnedAt: $checkedConvert('earnedAt', (v) => DateTime.parse(v as String)),
    heldUntil: $checkedConvert('heldUntil', (v) => DateTime.parse(v as String)),
    releasedAt: $checkedConvert(
      'releasedAt',
      (v) => v == null ? null : DateTime.parse(v as String),
    ),
  );
  return val;
});

Map<String, dynamic> _$EarningDtoToJson(EarningDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'projectTitle': instance.projectTitle,
      'projectReference': instance.projectReference,
      'currency': instance.currency,
      'amountMinor': instance.amountMinor,
      'earnedAt': instance.earnedAt.toIso8601String(),
      'heldUntil': instance.heldUntil.toIso8601String(),
      'releasedAt': instance.releasedAt?.toIso8601String(),
    };
