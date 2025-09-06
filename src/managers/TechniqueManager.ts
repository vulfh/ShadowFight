import { Technique, TechniqueCategory, PriorityLevel } from '../types'

export class TechniqueManager {
  private techniques: Technique[] = []
  private isInitialized: boolean = false

  async init(): Promise<void> {
    this.loadTechniques()
    this.isInitialized = true
  }

  private loadTechniques(): void {
    this.techniques = [
      // Punches
     
      { name: 'Left Straight Punch', file: 'smol-egrof-lefanim.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      { name: 'Right Straight Punch', file: 'yamin-egrof-lefanim.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
      { name: 'Left Back Fist', file: 'smol-makat-gav-yad.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      { name: 'Right Back Fist', file: 'yamin-makat-gav-yad.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
      // { name: 'Cross Body Punch', file: 'smol-beitat-magal-gvoa.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'LEFT' },
      // { name: 'Hook Punch', file: 'smol-beitat-magal-gvoa.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
      // { name: 'Uppercut Punch', file: 'smol-beitat-magal-gvoa.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      
      // // Strikes
      // { name: 'Palm Heel Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' },
      // { name: 'Hammer Fist', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      // { name: 'Elbow Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
      // { name: 'Eye Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'high', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
      // { name: 'Knife Hand Strike', file: 'smol-beitat-magal-gvoa.wav', category: 'Strikes', priority: 'medium', selected: true, weight: 1, targetLevel: 'NECK', side: 'LEFT' },
      
      // Kicks
      { name: 'Left High Front Kick', file: 'smol-beita-regila-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      { name: 'Right High Front Kick', file: 'yamin-beita-regila-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
      { name: 'Left Middle Front Kick', file: 'smol-beita-regila-la-guf.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'LEFT' },
      { name: 'Right Middle Front Kick', file: 'yamin-beita-regila-la-guf.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'RIGHT' },
      { name: 'Right Round Kick High ', file: 'yamin-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
      { name: 'Left Round Kick High ', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      { name: 'Right Low Kick ', file: 'yamin-beitat-magal-hitsonit-nemuha.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HIP', side: 'RIGHT' },
      { name: 'Left Low Kick ', file: 'smol-beitat-magal-nitsonit-nemuha.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HIP', side: 'LEFT' },
      
      // { name: 'Side Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'RIGHT' },
      // { name: 'Back Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'LEFT' },
      // { name: 'Heel Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'SHIN', side: 'RIGHT' },
      // { name: 'Spinning Outside Slap Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'low', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      
      // Knees
      // { name: 'Vertical Knee Strike', file: 'vertical_knee_strike.wav', category: 'Knees', priority: 'medium', selected: true, weight: 1, targetLevel: 'GROIN', side: 'RIGHT' },
      
      // // Defenses/Grabs
      // { name: 'Defense Against Front Choke', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'NECK', side: 'RIGHT' },
      // { name: 'Defense Against Side Headlock', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
      // { name: 'Defense Against Bear Hug', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' },
      // { name: 'Escape From Mount', file: 'smol-beitat-magal-gvoa.wav', category: 'Defenses/Grabs', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'LEFT' },
      
      // // Weapons
      // { name: 'Defense Against Knife Stab', file: 'smol-beitat-magal-gvoa.wav', category: 'Weapons', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' },
      // { name: 'Defense Against Gun Front', file: 'smol-beitat-magal-gvoa.wav', category: 'Weapons', priority: 'high', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' }
    ]
  }

  getTechniques(): Technique[] {
    return [...this.techniques]
  }

  getTechniquesByCategory(category: TechniqueCategory): Technique[] {
    return this.techniques.filter(t => t.category === category)
  }

  updateTechniquePriority(name: string, priority: PriorityLevel): void {
    const technique = this.techniques.find(t => t.name === name)
    if (technique) {
      technique.priority = priority
    }
  }

  updateTechniqueSelection(name: string, selected: boolean): void {
    const technique = this.techniques.find(t => t.name === name)
    if (technique) {
      technique.selected = selected
    }
  }

  selectAllTechniques(): void {
    this.techniques.forEach(t => t.selected = true)
  }

  deselectAllTechniques(): void {
    this.techniques.forEach(t => t.selected = false)
  }

  getSelectedTechniques(): Technique[] {
    return this.techniques.filter(t => t.selected)
  }

  isReady(): boolean {
    return this.isInitialized
  }
}
