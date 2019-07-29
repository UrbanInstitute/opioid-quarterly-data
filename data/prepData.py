#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prepData.py

Script to reshape source data into structure needed for d3 for the Opioids 
project page

Inputs:
    csv file of quarterly data
    csv file of quarterly data broken out by generic vs brand name
    csv file of annual data
    csv file of annual data broken out by generic vs brand name
    
Output:
    opioids_data.csv

Created on Tue Nov 27 11:39:19 2018

@author: afeng
"""

import pandas as pd
import numpy as np

# convert quarters into dates
# Q1 => Jan, Q2 => Apr, Q3 => July, Q4 => Oct
def qtrToDate(df):
    month = (df.quarter * 3) - 2
    return pd.to_datetime(str(df.year) + "-" + str(month) + "-01", format="%Y-%m-%d")

# filter out years not needed for chart
def filterDates(df, year):
    df = df[df['year'] >= year]
    return df

# add columns with values equal to zero to dataframe
def addCols(df, columnList):
    for col in columnList:
        df[col] = 0
        
# todo: turn this into command line arguments
total_qtr_filename = 'source/Quarterly_bydrug_2018Q4[1].csv'
generic_brand_qtr_filename = 'source/Quarterly_bydrug_bygeneric_2018Q4[1].csv'
total_yr_filename = 'source/Annual_bydrug_2018Q4[1].csv'
generic_brand_yr_filename = 'source/Annual_bydrug_bygeneric_2018Q4[1].csv'

# read in data
total_qtr = pd.read_csv(total_qtr_filename)
generic_brand_qtr = pd.read_csv(generic_brand_qtr_filename)
total_yr = pd.read_csv(total_yr_filename)
generic_brand_yr = pd.read_csv(generic_brand_yr_filename)

# indicate which dataframes have annual or quarterly data
total_qtr['temporal_unit'] = 'quarterly'
generic_brand_qtr['temporal_unit'] = 'quarterly'
total_yr['temporal_unit'] = 'annual'
generic_brand_yr['temporal_unit'] = 'annual'

# convert quarters and years into dates
total_qtr['date'] = total_qtr.apply(qtrToDate, axis = 1)
generic_brand_qtr['date'] = generic_brand_qtr.apply(qtrToDate, axis = 1)
total_yr['date'] = pd.to_datetime(total_yr['year'].astype(str), format="%Y")
generic_brand_yr['date'] = pd.to_datetime(generic_brand_yr['year'].astype(str), format="%Y")

# filter out 2018 Q4 data - researchers decided to suppress this (July 23)
total_qtr = total_qtr[total_qtr['date'] != pd.to_datetime("2018-10-01", format="%Y-%m-%d")]
generic_brand_qtr = generic_brand_qtr[generic_brand_qtr['date'] != pd.to_datetime("2018-10-01", format="%Y-%m-%d")]

# concatenate generic/brand and non-generic/brand datasets
total = pd.concat([total_qtr, total_yr])
generic_brand = pd.concat([generic_brand_qtr, generic_brand_yr])

# filter out years prior to 2010
total = filterDates(total, 2010)
generic_brand = filterDates(generic_brand, 2010)

# data cleaning
total.replace({'drugtype': 'bup'}, 'buprenorphine', inplace = True)
total.rename(columns = {'imprx': 'rx'}, inplace = True)
total = total[total.drugtype != 'all']
total.drop(['genericind', 'year', 'quarter'], axis = 1, inplace = True)

generic_brand.replace({'drugtype': 'bup'}, 'buprenorphine', inplace = True)
generic_brand.rename(columns = {'imprx': 'rx'}, inplace = True)
generic_brand = generic_brand[generic_brand.drugtype != 'all']
generic_brand.drop(['year', 'quarter'], axis = 1, inplace = True)

# reshape dataframes
total_long = pd.melt(total, id_vars=['state', 'drugtype', 'temporal_unit', 'date', 'futurerevision'],
        value_vars = ['rx', 'adjmedamt', 'percap_rx', 'percap_adjmedamt'],
        var_name = 'metric')
total_long['metric'] = np.where(total_long['metric'].str.contains('percap'), 
              total_long['metric'].str.split('_').str.get(1) + "_percap", total_long['metric'])
total_long.loc[((total_long['metric'].str.contains('percap')) & (total_long['futurerevision'] == 'per capita')), 'futurerevision'] = 'yes' 
total_long.loc[((~total_long['metric'].str.contains('percap')) & (total_long['futurerevision'] == 'per capita')), 'futurerevision'] = 'no' 
total_final = total_long.pivot_table(index=['state', 'temporal_unit', 'date', 'metric', 'futurerevision'], columns = 'drugtype', values = 'value')
addCols(total_final, ['buprenorphine_brand', 'buprenorphine_generic', 
                          'naloxone_brand', 'naloxone_generic', 'naltrexone_brand',
                          'naltrexone_generic'])

generic_brand_long = pd.melt(generic_brand, id_vars=['state', 'drugtype', 'temporal_unit', 'date', 'genericind', 'futurerevision'],
        value_vars = ['rx', 'adjmedamt'], var_name = 'metric')
generic_brand_long['drug_genericind'] = generic_brand_long['drugtype'] + "_" + generic_brand_long['genericind']
generic_brand_long['metric'] = generic_brand_long['metric'] + "_gb"
generic_brand_final = generic_brand_long.pivot_table(index=['state', 'temporal_unit', 'date', 'metric', 'futurerevision'], columns = 'drug_genericind', values = 'value')
addCols(generic_brand_final, ['buprenorphine', 'naloxone', 'naltrexone'])


final = pd.concat([total_final, generic_brand_final], sort = False).reset_index()
final.sort_values(by = ['temporal_unit', 'state', 'date', 'metric'], inplace = True)
final.replace({'state': 'XX'}, 'National', inplace = True)

final.to_csv('opioids_data.csv', index = False)
