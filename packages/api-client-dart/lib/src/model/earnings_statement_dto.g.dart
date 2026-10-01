// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'earnings_statement_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$EarningsStatementDtoCWProxy {
  EarningsStatementDto totals(List<EarningsTotalDto> totals);

  EarningsStatementDto earnings(List<EarningDto> earnings);

  EarningsStatementDto payouts(List<PayoutDto> payouts);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EarningsStatementDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EarningsStatementDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EarningsStatementDto call({
    List<EarningsTotalDto> totals,
    List<EarningDto> earnings,
    List<PayoutDto> payouts,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfEarningsStatementDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfEarningsStatementDto.copyWith.fieldName(...)`
class _$EarningsStatementDtoCWProxyImpl
    implements _$EarningsStatementDtoCWProxy {
  const _$EarningsStatementDtoCWProxyImpl(this._value);

  final EarningsStatementDto _value;

  @override
  EarningsStatementDto totals(List<EarningsTotalDto> totals) =>
      this(totals: totals);

  @override
  EarningsStatementDto earnings(List<EarningDto> earnings) =>
      this(earnings: earnings);

  @override
  EarningsStatementDto payouts(List<PayoutDto> payouts) =>
      this(payouts: payouts);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EarningsStatementDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EarningsStatementDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EarningsStatementDto call({
    Object? totals = const $CopyWithPlaceholder(),
    Object? earnings = const $CopyWithPlaceholder(),
    Object? payouts = const $CopyWithPlaceholder(),
  }) {
    return EarningsStatementDto(
      totals: totals == const $CopyWithPlaceholder()
          ? _value.totals
          // ignore: cast_nullable_to_non_nullable
          : totals as List<EarningsTotalDto>,
      earnings: earnings == const $CopyWithPlaceholder()
          ? _value.earnings
          // ignore: cast_nullable_to_non_nullable
          : earnings as List<EarningDto>,
      payouts: payouts == const $CopyWithPlaceholder()
          ? _value.payouts
          // ignore: cast_nullable_to_non_nullable
          : payouts as List<PayoutDto>,
    );
  }
}

extension $EarningsStatementDtoCopyWith on EarningsStatementDto {
  /// Returns a callable class that can be used as follows: `instanceOfEarningsStatementDto.copyWith(...)` or like so:`instanceOfEarningsStatementDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$EarningsStatementDtoCWProxy get copyWith =>
      _$EarningsStatementDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EarningsStatementDto _$EarningsStatementDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('EarningsStatementDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['totals', 'earnings', 'payouts']);
  final val = EarningsStatementDto(
    totals: $checkedConvert(
      'totals',
      (v) => (v as List<dynamic>)
          .map((e) => EarningsTotalDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    ),
    earnings: $checkedConvert(
      'earnings',
      (v) => (v as List<dynamic>)
          .map((e) => EarningDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    ),
    payouts: $checkedConvert(
      'payouts',
      (v) => (v as List<dynamic>)
          .map((e) => PayoutDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    ),
  );
  return val;
});

Map<String, dynamic> _$EarningsStatementDtoToJson(
  EarningsStatementDto instance,
) => <String, dynamic>{
  'totals': instance.totals.map((e) => e.toJson()).toList(),
  'earnings': instance.earnings.map((e) => e.toJson()).toList(),
  'payouts': instance.payouts.map((e) => e.toJson()).toList(),
};
