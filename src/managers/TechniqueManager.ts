import { Technique, TechniqueCategory, PriorityLevel } from '../types'
import { MODES } from '../constants/modes'

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

          { name: 'Left Uppercot', modes:[MODES.PERFORMING, MODES.RESPONDING],file: 'smol-makat-snukeret.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Uppercot', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-makat-snukeret.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Hook', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-magal-la-rosh.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Hook', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-magal-la-rosh.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },

          { name: 'Left Straight Punch', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-egrof-lefanim.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Straight Punch', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-egrof-lefanim.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Back Fist',  modes:[MODES.PERFORMING, MODES.RESPONDING],file: 'smol-makat-gav-yad.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Back Fist', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-makat-gav-yad.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Head Left Right', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'rosh-smol-yamin.wav', category: 'Punches', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
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
          { name: 'Right Side Kick', modes: [MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beita-tatsad.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Side Kick', modes: [MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beita-latsad.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Knee Front Kick', modes: [MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beitat-bereh-milafanim.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Knee Front Kick', modes: [MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-bereh-milefanim.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Left High Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beita-regila-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right High Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beita-regila-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Middle Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beita-regila-la-guf.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'LEFT' },
          { name: 'Right Middle Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beita-regila-la-guf.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'RIGHT' },
          { name: 'Right Round Kick High ', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Round Kick High ', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Low Kick ',  modes:[MODES.PERFORMING, MODES.RESPONDING],file: 'yamin-beitat-magal-hitsonit-nemuha.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HIP', side: 'RIGHT' },
          { name: 'Left Low Kick ', modes: [MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-magal-nitsonit-nemuha.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HIP', side: 'LEFT' },
          { name: 'Slipping Against Left Front Kick In Dead Zone', modes: [MODES.PERFORMING], file: 'smol-agana-neged-beita-regila-tsad-met.wav', category: 'Slip', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'LEFT' },

          { name: 'Left Question Mark Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-magal-be-hataya.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Question Mark Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beitat-magal-be-hataya.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Back Round House Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-magal-le-ahor.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Back Round House Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beitat-magal-le-ahor.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Axe Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-patish.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Axe Kick',  modes:[MODES.PERFORMING, MODES.RESPONDING],file: 'yamin-beitat-patish.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Turn Back Round House Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-magal-leahor-besivuv.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Right Turn Back Round House Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beitat-magal-leahor-besivuv.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },

          { name: 'Left Side Knee Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-beitat-bereh-mihatsad.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'LEFT' },
          { name: 'Right Side Knee Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-beitat-bereh-mihatsad.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'STOMACH', side: 'RIGHT' },

          { name: 'Left Underhook Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-gziza-kidmit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'LEFT' },
          { name: 'Right Underhook Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING],file: 'yamin-gziza-kidmit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'RIGHT' },
          { name: 'Left Underhook Back Kick',  modes:[MODES.PERFORMING, MODES.RESPONDING],file: 'smol-gziza-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'LEFT' },
          { name: 'Right Underhook Back Kick', modes:[MODES.PERFORMING, MODES.RESPONDING],file: 'yamin-gziza-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'RIGHT' },
          { name: 'Left Underhook Back  And Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'smol-gziza-kidmit-ve-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'LEFT' },
          { name: 'Right Underhook Back  And Front Kick', modes:[MODES.PERFORMING, MODES.RESPONDING], file: 'yamin-gziza-kidmit-ve-ahorit.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'FOOT', side: 'RIGHT' },

          // { name: 'Heel Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'medium', selected: true, weight: 1, targetLevel: 'SHIN', side: 'RIGHT' },

          // { name: 'Spinning Outside Slap Kick', file: 'smol-beitat-magal-gvoa.wav', category: 'Kicks', priority: 'low', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },

          //Kinfe
          { name: 'Right Hand Knife Top Front Attack', modes:[MODES.RESPONDING], file: 'yamin-tkifat-sakin-elit.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'HEAD', side: 'RIGHT' },
          { name: 'Left Hand Knife Top Front Attack', modes:[MODES.RESPONDING], file: 'smol-tkifat-sakin-elit.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'HEAD', side: 'LEFT' },
          { name: 'Left Hand Knife Top Back Attack', modes:[MODES.RESPONDING], file: 'smol-dkirat-gav-mi-lemala.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'LEFT' },
          { name: 'Right Hand Knife Top Back Attack', modes:[MODES.RESPONDING], file: 'yamin-dkirat-gav-mi-lemamala.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'RIGHT' },

          { name: 'Left Hand Knife Oriental Back Attack', modes:[MODES.RESPONDING], file: 'smol-dkira-mizrahit-mi-ahor.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'LEFT' },
          { name: 'Right Hand Knife Oriental Back Attack', modes:[MODES.RESPONDING], file: 'yamin-dkira-mizrahit-mi-ahor.wav', category: 'Knife', priority: 'high', selected: true, weight: 1, targetLevel: 'BACK', side: 'RIGHT' },
      

      // Hand-Grip
      { name: 'Left Hand Grip', modes:[MODES.RESPONDING], file: 'smol-tfisat-yad-mul-yad.wav', category: 'Hand-Grip', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'LEFT' },
      { name: 'Right Hand Grip', modes:[MODES.RESPONDING], file: 'yamin-tfisat-yad-mul-yad.wav', category: 'Hand-Grip', priority: 'medium', selected: true, weight: 1, targetLevel: 'CHEST', side: 'RIGHT' },
      
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
