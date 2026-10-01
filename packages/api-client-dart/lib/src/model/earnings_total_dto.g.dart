// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'earnings_total_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$EarningsTotalDtoCWProxy {
  EarningsTotalDto currency(String currency);

  EarningsTotalDto earnedMinor(num earnedMinor);

  EarningsTotalDto heldMinor(num heldMinor);

  EarningsTotalDto payableMinor(num payableMinor);

  EarningsTotalDto paidMinor(num paidMinor);

  EarningsTotalDto withheldMinor(num withheldMinor);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EarningsTotalDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EarningsTotalDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EarningsTotalDto call({
    String currency,
    num earnedMinor,
    num heldMinor,
    num payableMinor,
    num paidMinor,
    num withheldMinor,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfEarningsTotalDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfEarningsTotalDto.copyWith.fieldName(...)`
class _$EarningsTotalDtoCWProxyImpl implements _$EarningsTotalDtoCWProxy {
  const _$EarningsTotalDtoCWProxyImpl(this._value);

  final EarningsTotalDto _value;

  @override
  EarningsTotalDto currency(String currency) => this(currency: currency);

  @override
  EarningsTotalDto earnedMinor(num earnedMinor) =>
      this(earnedMinor: earnedMinor);

  @override
  EarningsTotalDto heldMinor(num heldMinor) => this(heldMinor: heldMinor);

  @override
  EarningsTotalDto payableMinor(num payableMinor) =>
      this(payableMinor: payableMinor);

  @override
  EarningsTotalDto paidMinor(num paidMinor) => this(paidMinor: paidMinor);

  @override
  EarningsTotalDto withheldMinor(num withheldMinor) =>
      this(withheldMinor: withheldMinor);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EarningsTotalDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EarningsTotalDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EarningsTotalDto call({
    Object? currency = const $CopyWithPlaceholder(),
    Object? earnedMinor = const $CopyWithPlaceholder(),
    Object? heldMinor = const $CopyWithPlaceholder(),
    Object? payableMinor = const $CopyWithPlaceholder(),
    Object? paidMinor = const $CopyWithPlaceholder(),
    Object? withheldMinor = const $CopyWithPlaceholder(),
  }) {
    return EarningsTotalDto(
      currency: currency == const $CopyWithPlaceholder()
          ? _value.currency
          // ignore: cast_nullable_to_non_nullable
          : currency as String,
      earnedMinor: earnedMinor == const $CopyWithPlaceholder()
          ? _value.earnedMinor
          // ignore: cast_nullable_to_non_nullable
          : earnedMinor as num,
      heldMinor: heldMinor == const $CopyWithPlaceholder()
          ? _value.heldMinor
          // ignore: cast_nullable_to_non_nullable
          : heldMinor as num,
      payableMinor: payableMinor == const $CopyWithPlaceholder()
          ? _value.payableMinor
          // ignore: cast_nullable_to_non_nullable
          : payableMinor as num,
      paidMinor: paidMinor == const $CopyWithPlaceholder()
          ? _value.paidMinor
          // ignore: cast_nullable_to_non_nullable
          : paidMinor as num,
      withheldMinor: withheldMinor == const $CopyWithPlaceholder()
          ? _value.withheldMinor
          // ignore: cast_nullable_to_non_nullable
          : withheldMinor as num,
    );
  }
}

extension $EarningsTotalDtoCopyWith on EarningsTotalDto {
  /// Returns a callable class that can be used as follows: `instanceOfEarningsTotalDto.copyWith(...)` or like so:`instanceOfEarningsTotalDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$EarningsTotalDtoCWProxy get copyWith => _$EarningsTotalDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EarningsTotalDto _$EarningsTotalDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('EarningsTotalDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'currency',
          'earnedMinor',
          'heldMinor',
          'payableMinor',
          'paidMinor',
          'withheldMinor',
        ],
      );
      final val = EarningsTotalDto(
        currency: $checkedConvert('currency', (v) => v as String),
        earnedMinor: $checkedConvert('earnedMinor', (v) => v as num),
        heldMinor: $checkedConvert('heldMinor', (v) => v as num),
        payableMinor: $checkedConvert('payableMinor', (v) => v as num),
        paidMinor: $checkedConvert('paidMinor', (v) => v as num),
        withheldMinor: $checkedConvert('withheldMinor', (v) => v as num),
      );
      return val;
    });

Map<String, dynamic> _$EarningsTotalDtoToJson(EarningsTotalDto instance) =>
    <String, dynamic>{
      'currency': instance.currency,
      'earnedMinor': instance.earnedMinor,
      'heldMinor': instance.heldMinor,
      'payableMinor': instance.payableMinor,
      'paidMinor': instance.paidMinor,
      'withheldMinor': instance.withheldMinor,
    };
